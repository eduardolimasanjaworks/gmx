
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
    console.log("Fetching roles...");
    const rolesData = await request('GET', '/roles');
    if (!rolesData || !rolesData.data) {
        console.error("Failed to fetch roles");
        return;
    }

    const adminRole = rolesData.data.find(r => r.admin_access === true || r.name === 'Administrator');
    if (!adminRole) {
        console.error("No Admin role found!");
        return;
    }
    console.log("Found Admin Role:", adminRole.id);

    console.log("Creating Admin User...");
    const email = 'admin@gmx.com';
    const password = 'admin'; // Temporary password

    const userData = {
        email: email,
        password: password,
        role: adminRole.id,
        first_name: 'Super',
        last_name: 'Admin',
        status: 'active'
    };

    const createRes = await request('POST', '/users', userData);

    if (createRes && createRes.errors) {
        // If user exists, try to update password
        if (createRes.errors[0].extensions?.code === 'RECORD_NOT_UNIQUE') {
            console.log("User already exists. Updating password...");
            // Find user ID
            const usersRes = await request('GET', `/users?filter[email][_eq]=${email}`);
            if (usersRes?.data?.[0]) {
                const userId = usersRes.data[0].id;
                await request('PATCH', `/users/${userId}`, { password: password });
                console.log("Password updated successfully.");
            }
        } else {
            console.error("Error creating user:", JSON.stringify(createRes.errors));
        }
    } else {
        console.log("Admin user created successfully.");
    }

    console.log("Credentials:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

run();
