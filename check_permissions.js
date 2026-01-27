
import http from 'http';

const ADMIN_TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const HOST = '91.99.137.101';
const PORT = 8057;
const TARGET_POLICY_ID = 'ce07c13c-1814-43ec-b439-ef4500a379f3'; // Embarques Read Policy

function request(method, path) {
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
                    resolve({ error: data });
                }
            });
        });
        req.end();
    });
}

async function run() {
    console.log(`Checking permissions for Policy ${TARGET_POLICY_ID}...`);
    // Fetch all permissions, limit -1 to get everything
    const permissions = await request('GET', '/permissions?limit=-1');

    if (permissions.data) {
        const policyPerms = permissions.data.filter(p => p.policy === TARGET_POLICY_ID && p.collection === 'embarques');
        console.log(`Found ${policyPerms.length} permission(s) for 'embarques':`);
        policyPerms.forEach(p => {
            console.log(`ID: ${p.id}`);
            console.log(`Action: ${p.action}`);
            console.log(`Fields: ${JSON.stringify(p.fields)}`);
            console.log('---');
        });
    } else {
        console.log("Error fetching permissions:", JSON.stringify(permissions));
    }
}

run();
