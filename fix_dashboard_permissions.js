
import http from 'http';

const CONFIG = {
    hostname: '91.99.137.101',
    port: 8057,
    token: '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah' // Admin Static Token
};

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CONFIG.hostname,
            port: CONFIG.port,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function getRoles() {
    console.log("Fetching roles...");
    const response = await request('GET', '/roles?limit=-1');
    return response.data || [];
}

async function setPermission(collection, roleName, roleId, action, permissions) {
    console.log(`Setting ${action} permission for ${collection} [Role: ${roleName || 'Public'}]...`);

    // Check existing permission
    const roleQuery = roleId ? `&filter[role][_eq]=${roleId}` : `&filter[role][_null]=true`;
    const existing = await request('GET', `/permissions?filter[collection][_eq]=${collection}${roleQuery}&filter[action][_eq]=${action}`);

    const payload = {
        collection,
        action,
        permissions,
        fields: ['*'], // Explicitly allow ALL fields
        role: roleId
    };

    if (existing.data && existing.data.length > 0) {
        // Update
        const id = existing.data[0].id;
        await request('PATCH', `/permissions/${id}`, payload);
        console.log(`Updated permission ${id} for ${collection} [Role: ${roleName || 'Public'}]`);
    } else {
        // Create
        await request('POST', '/permissions', payload);
        console.log(`Created permission for ${collection} [Role: ${roleName || 'Public'}]`);
    }
}

async function run() {
    console.log("Fixing Dashboard Permissions for ALL Roles...");

    const roles = await getRoles();
    console.log(`Found ${roles.length} roles.`);

    const collections = [
        'embarques',
        'cadastro_motorista',
        'vehicle_matches',
        'disponivel',
        'directus_users',
        'directus_files'
    ];

    // 1. Grant Public (null)
    for (const col of collections) {
        await setPermission(col, 'Public', null, 'read', {});
    }

    // 2. Grant for ALL Roles found (including Authenticated, Motorista, etc.)
    for (const role of roles) {
        for (const col of collections) {
            await setPermission(col, role.name, role.id, 'read', {});
        }
    }

    console.log("Permissions update complete.");
}

run();
