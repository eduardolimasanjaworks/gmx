
import http from 'http';

const CONFIG = {
    hostname: '91.99.137.101',
    port: 8057,
    token: '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah' // Admin Static Token
};

function request(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CONFIG.hostname,
            port: CONFIG.port,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log("Inspecting permissions for 'embarques'...");
    const response = await request('/permissions?filter[collection][_eq]=embarques');
    if (response.data) {
        console.log(`Found ${response.data.length} permission rules for 'embarques':`);
        response.data.forEach(p => {
            console.log(`- ID: ${p.id} | Role: ${p.role} | Action: ${p.action} | Fields: ${p.fields}`);
        });
    } else {
        console.log("Error fetching permissions:", response);
    }
}

run();
