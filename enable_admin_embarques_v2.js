
import http from 'http';

const ADMIN_TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const HOST = '91.99.137.101';
const PORT = 8057;
const TARGET_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.log("Error parsing response:", data);
                    resolve({ error: data });
                }
            });
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("Creating/Finding 'Embarques Read' Policy...");

    // 1. Check if policy already exists
    const policies = await request('GET', '/policies?filter[name][_eq]=' + encodeURIComponent('Embarques Read'));
    let policyId;

    if (policies.data && policies.data.length > 0) {
        policyId = policies.data[0].id;
        console.log("Policy found:", policyId);
    } else {
        const newPolicy = await request('POST', '/policies', {
            name: "Embarques Read",
            icon: "local_shipping",
            description: "Access to embarques table"
        });
        if (newPolicy.data) {
            policyId = newPolicy.data.id;
            console.log("Policy created:", policyId);
        } else {
            console.error("Failed to create policy:", JSON.stringify(newPolicy));
            return;
        }
    }

    // Check if permission exists for this policy (moved up for helper)
    const perms = await request('GET', '/permissions?limit=-1');

    // Helper to add/update permission
    const addPermission = async (collection) => {
        const existing = perms.data.find(p => p.policy === policyId && p.collection === collection);
        if (existing) {
            console.log(`Updating ${collection} permission...`);
            await request('PATCH', `/permissions/${existing.id}`, {
                action: 'read',
                fields: ['*', 'date_created', 'date_updated']
            });
        } else {
            console.log(`Creating ${collection} permission...`);
            await request('POST', '/permissions', {
                policy: policyId,
                collection: collection,
                action: 'read',
                fields: ['*', 'date_created', 'date_updated']
            });
        }
    };

    // 2. Add Permission to Policy
    console.log("Adding permissions to policy...");

    // Embarques (System fields explicit)
    const existingEmbarques = perms.data.find(p => p.policy === policyId && p.collection === 'embarques');
    if (existingEmbarques) {
        console.log("Updating embarques permission...");
        await request('PATCH', `/permissions/${existingEmbarques.id}`, {
            action: 'read',
            fields: ['*', 'date_created', 'date_updated', 'user_created', 'user_updated', 'driver_id']
        });
    } else {
        console.log("Creating embarques permission...");
        const res = await request('POST', '/permissions', {
            policy: policyId,
            collection: 'embarques',
            action: 'read',
            fields: ['*', 'date_created', 'date_updated', 'user_created', 'user_updated', 'driver_id']
        });
        if (res.errors) console.log("Embarques Error:", JSON.stringify(res.errors));
    }

    // Related Collections
    await addPermission('cadastro_motorista');
    await addPermission('directus_users');
    await addPermission('directus_files');

    // Dashboard Collections
    await addPermission('disponivel');
    await addPermission('operational_alerts');
    await addPermission('vehicle_matches');

    // Verify specific system fields for these
    const systemCollections = ['disponivel', 'operational_alerts', 'vehicle_matches'];
    for (const coll of systemCollections) {
        const p = perms.data.find(p => p.policy === policyId && p.collection === coll);
        // Ensure date_created is set effectively by * but good to be sure if issues persist
        // We rely on * for now as per addPermission helper
    }

    // 3. Attach Policy to Role
    console.log("Attaching policy to Administrator Role...");
    const role = await request('GET', `/roles/${TARGET_ROLE_ID}`);
    const currentPolicies = role.data.policies || [];

    if (!currentPolicies.includes(policyId)) {
        const updatedPolicies = [...currentPolicies, policyId];
        await request('PATCH', `/roles/${TARGET_ROLE_ID}`, {
            policies: updatedPolicies
        });
        console.log("Role updated with new policy.");
    } else {
        console.log("Role already has this policy.");
    }
}

run();
