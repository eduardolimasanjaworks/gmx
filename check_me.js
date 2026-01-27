
import http from 'http';

const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const HOST = '91.99.137.101';
const PORT = 8057;

function request(method, path) {
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
                    resolve({ error: data });
                }
            });
        });
        req.end();
    });
}

async function run() {
    console.log("Checking /users/me...");
    const me = await request('GET', '/users/me?fields=id,role,email');
    if (me.data) {
        console.log("User ID:", me.data.id);
        console.log("User Email:", me.data.email);
        console.log("Role ID:", me.data.role);
    } else {
        console.error("Error:", JSON.stringify(me));
    }
}

run();
