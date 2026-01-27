
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
    console.log("Fetching fields for cadastro_motorista...");
    const response = await request('/fields/cadastro_motorista');
    if (response.data) {
        console.log("Fields found:");
        response.data.forEach(f => console.log(`- ${f.field} (${f.type})`));
    } else {
        console.log("Error fetching fields:", response);
    }
}

run();
