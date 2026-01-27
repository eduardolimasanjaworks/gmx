
import http from 'http';

const ADMIN_TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const HOST = '91.99.137.101';
const PORT = 8057;
const TARGET_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

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
    console.log(`Inspecting Relations for 'embarques'...`);
    const relations = await request('GET', '/relations?filter[collection]=embarques');
    if (relations.data) {
        relations.data.forEach(r => {
            console.log(`Field: ${r.field} -> Related Collection: ${r.related_collection}`);
        });
    } else {
        console.log("No relations found.");
    }
}

run();
