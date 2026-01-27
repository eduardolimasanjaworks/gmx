
import http from 'http';

const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const HOST = '91.99.137.101';
const PORT = 8057;

const ADMIN_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

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
                    console.log(`[${method} ${path}] Error parsing JSON response:`, data);
                    resolve(null);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function syncUsers() {
    console.log("=== Starting User Synchronization ===");

    // 1. Get all App Users (The profiles created in the Dashboard UI)
    console.log("Fetching App Users (Profiles)...");
    const appUsersRes = await request('GET', '/items/app_users?fields=*,role_id.*');

    if (!appUsersRes || !appUsersRes.data) {
        console.error("Failed to fetch app_users. Aborting.");
        return;
    }

    const appUsers = appUsersRes.data;
    console.log(`Found ${appUsers.length} profiles in Dashboard.`);

    // 2. Get all Directus Users (The actual login accounts)
    console.log("Fetching Directus Auth Users...");
    const authUsersRes = await request('GET', '/users?fields=id,email');
    const authUsers = authUsersRes?.data || [];
    const authEmails = new Set(authUsers.map(u => u.email.toLowerCase()));

    console.log(`Found ${authUsers.length} active login accounts.`);

    // 3. Sync Logic
    for (const profile of appUsers) {
        const email = profile.email.toLowerCase();

        if (authEmails.has(email)) {
            console.log(`[OK] Login exists for: ${email}`);
        } else {
            console.log(`[MISSING] No login for profile: ${email}. Creating...`);

            // Password logic: Try to use password_hash if plain text (temporary dev feature) or default
            const password = profile.password_hash || '123456';

            // Determine Role: Try to map 'app_role' to a real Directus Role if possible, or use Public/Admin
            // For now, give them Admin access if their profile says 'admin', otherwise public or a standard role
            // WE WILL USE ADMIN ROLE FOR ALL DEV USERS TO AVOID PERMISSION HEADACHES FOR NOW
            // In prod, we would map specific Directus Roles.

            const userData = {
                email: email,
                password: password,
                first_name: profile.display_name?.split(' ')[0] || 'User',
                last_name: profile.display_name?.split(' ').slice(1).join(' ') || 'GMX',
                role: ADMIN_ROLE_ID, // Giving Admin Role to ensure they can log in and read data
                status: 'active'
            };

            const createRes = await request('POST', '/users', userData);
            if (createRes && createRes.data) {
                console.log(`  -> Created login for ${email} (Pass: ${password})`);
            } else {
                console.error(`  -> Failed to create login for ${email}:`, JSON.stringify(createRes?.errors));
            }
        }
    }

    // 4. Force Create admin@admin.com if not present in app_users
    if (!authEmails.has('admin@admin.com')) {
        console.log("[MANUAL] Creating admin@admin.com...");
        await request('POST', '/users', {
            email: 'admin@admin.com',
            password: 'admin',
            role: ADMIN_ROLE_ID,
            status: 'active',
            first_name: 'Admin',
            last_name: 'Manual'
        });
        console.log("  -> Created admin@admin.com (Pass: admin)");
    } else {
        // Reset password just in case
        const uid = authUsers.find(u => u.email === 'admin@admin.com').id;
        console.log(`[MANUAL] Resetting password for admin@admin.com...`);
        await request('PATCH', `/users/${uid}`, { password: 'admin' });
    }

    console.log("=== Sync Complete ===");
}

syncUsers();
