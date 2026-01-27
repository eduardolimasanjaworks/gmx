
import http from 'http';

const options = {
    hostname: '91.99.137.101',
    port: 8057,
    path: '/roles',
    method: 'GET',
    headers: { 'Authorization': 'Bearer 1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah' }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const roles = JSON.parse(data).data;
            console.log("--- ROLES ---");
            roles.forEach(r => {
                console.log(`ID: ${r.id} | Name: ${r.name} | Description: ${r.description}`);
            });
        } catch (e) {
            console.log("Error parsing:", data);
        }
    });
});
req.end();
