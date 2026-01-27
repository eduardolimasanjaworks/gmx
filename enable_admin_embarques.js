
import http from 'http';

// OLD TOKEN (Provenance: create_admin.js)
const ADMIN_TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const HOST = '91.99.137.101';
const PORT = 8057;

const TARGET_POLICY_ID = '674d71f5-27bd-41e5-98d0-f73274b0feeb'; // Administrator Policy

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
                    resolve(null);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log(`Granting READ permissions for 'embarques' to Policy ${TARGET_POLICY_ID}...`);

    // Get existing permissions
    const permissionsData = await request('GET', '/permissions?limit=-1');

    // Check if permission already exists
    const existingPerm = permissionsData.data.find(p => p.policy === TARGET_POLICY_ID && p.collection === 'embarques');

    if (existingPerm) {
        console.log("Permission exists (ID: " + existingPerm.id + "), updating...");
        const response = await request('PATCH', `/permissions/${existingPerm.id}`, {
            action: 'read',
            fields: ['*', 'date_created', 'date_updated', 'driver_id.*']
        });
        console.log("PATCH Response:", JSON.stringify(response));
    } else {
        console.log("Permission does not exist, creating...");
        const response = await request('POST', '/permissions', {
            policy: TARGET_POLICY_ID,
            collection: 'embarques',
            action: 'read',
            fields: ['*', 'date_created', 'date_updated', 'driver_id.*']
        });
        console.log("Create Response:", JSON.stringify(response));
    }
    console.log("Permissions updated.");
}

run();
