import { createDirectus, rest, staticToken, createRole, createPolicy, createPermission, updateSettings } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function forcePublicAccess() {
    console.log("Configuring Public Access...");

    try {
        // 1. Create Policy
        console.log(" Creating Policy...");
        const policy = await client.request(createPolicy({
            name: 'Public Motorista Policy',
            icon: 'public',
            app_access: false,
            admin_access: false,
            enforce_tfa: false
        }));
        console.log(` ✅ Policy Created: ${policy.id}`);

        // 2. Add Permissions to Policy
        const actions = ['read', 'create', 'update', 'delete'];
        for (const action of actions) {
            await client.request(createPermission({
                policy: policy.id,
                collection: TABLE_NAME,
                action: action,
                fields: ['*']
            }));
        }
        console.log(" ✅ Permissions added to Policy.");

        // 3. Create Role
        console.log(" Creating 'App Public' Role...");
        const role = await client.request(createRole({
            name: 'App Public',
            icon: 'public',
            description: 'Role for unauthenticated users',
            policies: [policy.id] // Attach policy immediately
        }));
        console.log(` ✅ Role Created: ${role.id}`);

        // 4. Update Settings to use this Role as Public
        console.log(" Updating System Settings...");
        await client.request(updateSettings({
            public_role: role.id
        }));
        console.log(" ✨ SUCCESS: Public Access Configured!");

    } catch (err) {
        if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
            console.log("⚠️ Role or Policy might already exist. Check Directus Admin.");
        }
        console.error("❌ Error:", err);
    }
}

forcePublicAccess();
