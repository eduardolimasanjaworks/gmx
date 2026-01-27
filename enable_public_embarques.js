
import http from 'http';

const TOKEN = 'HM5fQ_PdQKtU95SStnyosF7RY_gnRuYo';
const HOST = '91.99.137.101';
const PORT = 8057;

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.log("Error parsing JSON response:", data);
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
    const PUBLIC_ROLE_ID = '8d5a153b-e06e-41a4-9665-27a1496a793a';
    console.log(`Setting Public Read permissions for 'embarques' (Role ID: ${PUBLIC_ROLE_ID})...`);

    // Create or Update permission for embarques + public
    const permissionsData = await request('GET', '/permissions');

    // Check if permission already exists
    const existingPerm = permissionsData.data.find(p => p.role === PUBLIC_ROLE_ID && p.collection === 'embarques');

    if (existingPerm) {
        console.log("Permission exists, updating to allow read...");
        await request('PATCH', `/permissions/${existingPerm.id}`, {
            action: 'read',
            fields: ['*'] // Allow reading all fields
        });
    } else {
        console.log("Permission does not exist, creating...");
        await request('POST', '/permissions', {
            role: PUBLIC_ROLE_ID,
            collection: 'embarques',
            action: 'read',
            fields: ['*']
        });
    }
    console.log("Public read permissions set for 'embarques'.");
}

run();
