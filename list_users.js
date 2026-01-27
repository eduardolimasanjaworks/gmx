
import http from 'http';

const options = {
    hostname: '91.99.137.101',
    port: 8057,
    path: '/users?fields=id,email,role,first_name,last_name',
    method: 'GET',
    headers: { 'Authorization': 'Bearer 1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah' }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const users = JSON.parse(data).data;
            console.log("Users found:", users.length);
            users.forEach(u => {
                console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.first_name} ${u.last_name} | Role: ${u.role}`);
            });
        } catch (e) {
            console.log("Error parsing:", data);
        }
    });
});
req.end();
