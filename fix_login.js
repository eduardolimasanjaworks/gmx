
import http from 'http';

const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
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
    console.log("Checking user statuses...");

    // 1. Fetch all directus users (Authentication)
    const directusUsers = await request('GET', '/users?fields=id,email,status');
    console.log("\n--- Directus Auth Users ---");
    if (directusUsers && directusUsers.data) {
        directusUsers.data.forEach(u => {
            console.log(`Email: ${u.email} | Status: ${u.status} | ID: ${u.id}`);
        });
    } else {
        console.log("No users found or error fetching.");
    }

    // 2. Fetch all app_users (Profiles)
    const appUsers = await request('GET', '/items/app_users?fields=id,email,active');
    console.log("\n--- App Profile Users ---");
    if (appUsers && appUsers.data) {
        appUsers.data.forEach(u => {
            console.log(`Email: ${u.email} | Active: ${u.active} | ID: ${u.id}`);
        });
    }

    // 3. Create/Reset specific user 'admin@admin.com' if requested
    const targetEmail = 'admin@admin.com';
    const targetPass = 'admin';

    console.log(`\nAttempting to reset/create [${targetEmail}] with password [${targetPass}]...`);

    const existingUser = directusUsers?.data?.find(u => u.email === targetEmail);

    if (existingUser) {
        console.log(`User ${targetEmail} found. Updating password...`);
        await request('PATCH', `/users/${existingUser.id}`, { password: targetPass, status: 'active' });
        console.log("Password updated.");
    } else {
        console.log(`User ${targetEmail} not found in Auth. Creating...`);
        // Start process to create
        // Need a role first - let's use Public or Admin
        const roles = await request('GET', '/roles');
        const adminRole = roles?.data?.find(r => r.admin_access === true)?.id;

        if (adminRole) {
            await request('POST', '/users', {
                email: targetEmail,
                password: targetPass,
                role: adminRole,
                status: 'active',
                first_name: 'Admin',
                last_name: 'Teste'
            });
            console.log("User created.");
        } else {
            console.log("Cannot create user: Admin role not found.");
        }
    }

    console.log("\nDone. Try logging in with:");
    console.log(`Email: ${targetEmail}`);
    console.log(`Password: ${targetPass}`);
}

run();
