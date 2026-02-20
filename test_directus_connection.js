import fetch from 'node-fetch';

const url = 'http://91.99.137.101:8057';
const token = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn';

async function testConnection() {
    console.log(`Testing connection to ${url}...`);

    // 1. Ping (Public)
    try {
        const pingRes = await fetch(`${url}/server/ping`);
        console.log(`\nPing Status: ${pingRes.status} ${pingRes.statusText}`);
        const pingText = await pingRes.text();
        console.log(`Ping Response: ${pingText}`);
    } catch (e) {
        console.error('Ping failed:', e.message);
    }

    // 2. Auth Check (Users/me)
    try {
        const meRes = await fetch(`${url}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log(`\nAuth Status: ${meRes.status} ${meRes.statusText}`);
        if (!meRes.ok) {
            console.log('Auth failed. Response headers:', meRes.headers.raw());
        }
        const meData = await meRes.json();
        console.log('User Data:', JSON.stringify(meData, null, 2));
    } catch (e) {
        console.error('Auth check failed:', e.message);
    }
}

testConnection();
