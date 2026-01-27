
import http from 'http';

const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
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
    console.log("Checking permissions field on app_users...");

    // Check if field exists
    const fields = await request('GET', '/fields/app_users');
    const hasField = fields.data.find(f => f.field === 'permissions');

    if (hasField) {
        console.log("Field 'permissions' already exists.");
    } else {
        console.log("Field 'permissions' missing. Creating...");
        await request('POST', '/fields/app_users', {
            field: 'permissions',
            type: 'json',
            meta: {
                interface: 'tags',
                options: {
                    placeholder: 'Adicionar permissões...'
                },
                display: 'labels',
                width: 'full',
                note: 'Permissões específicas do usuário (sobrescreve cargo)'
            }
        });
        console.log("Field created.");
    }
}

run();
