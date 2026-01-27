
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
                    console.log("Error parsing JSON:", data);
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
    console.log("Listing Collections...");
    const result = await request('GET', '/collections');
    if (result.data) {
        result.data.forEach(c => console.log(c.collection));
    } else {
        console.log("Error:", JSON.stringify(result));
    }
}

run();
