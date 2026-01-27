
import http from 'http';

const CONFIG = {
    hostname: '91.99.137.101',
    port: 8057,
    token: '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah'
};

function request(method, path) {
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
        req.end();
    });
}

async function run() {
    console.log("Inspecting 'embarques' table data...");

    // Fetch all items from embarques
    const response = await request('GET', '/items/embarques?fields=id,status,driver_id,origin,destination&limit=50');

    if (response.data) {
        console.log(`Found ${response.data.length} records.`);
        console.log(JSON.stringify(response.data.map(item => ({
            ID: item.id,
            Status: item.status,
            Driver_ID: item.driver_id,
            Has_Driver: item.driver_id ? 'YES' : 'NO',
            Route: `${item.origin} -> ${item.destination}`
        })), null, 2));
    } else {
        console.log("No data found or error:", response);
    }
}

run();
