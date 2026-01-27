
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

async function run() {
    console.log("FORCE FIX: Deleting and Recreating permissions...");

    const collections = [
        'embarques',
        'vehicle_matches',
        'cadastro_motorista',
        'disponivel',
        'directus_users',
        'directus_files'
    ];

    // 1. DELETE ALL permissions for these collections
    for (const col of collections) {
        console.log(`Cleaning permissions for ${col}...`);
        const existing = await request('GET', `/permissions?filter[collection][_eq]=${col}&limit=-1`);
        if (existing.data) {
            for (const p of existing.data) {
                console.log(`  -> Deleting rule ${p.id} (Role: ${p.role})`);
                await request('DELETE', `/permissions/${p.id}`);
            }
        }
    }

    // 2. CREATE clean PUBLIC READ permission
    for (const col of collections) {
        console.log(`Creating PUBLIC READ for ${col}...`);
        await request('POST', '/permissions', {
            collection: col,
            action: 'read',
            fields: ['*'], // ALL fields
            role: null // Public
        });
    }

    console.log("Force fix complete. All existing rules replaced with Public Read (*).");
}

run();
