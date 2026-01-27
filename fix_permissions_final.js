
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = 'EQ35A8-16012024-VELOZ';

async function fixPermissions() {
    try {
        console.log('🔄 Starting Permission Fix...');

        // 1. Identify the Current User (Token User)
        console.log('1️⃣ Checking Token User...');
        const meRes = await fetch(`${DIRECTUS_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const meData = await meRes.json();

        let tokenRole = null;
        if (meData.data) {
            console.log(`   User: ${meData.data.first_name} ${meData.data.last_name} (${meData.data.email})`);
            tokenRole = meData.data.role;
            console.log(`   Role ID: ${tokenRole}`);
        } else {
            console.error('   ❌ Could not verify token user:', meData);
        }

        // 2. Identify Public Role
        // In Directus, permissions with role=null apply to public. We don't need a specific ID.
        console.log('2️⃣ Targeting Public Role (null)...');

        // 3. Define Permissions to Create/Update
        // We want to ensure Public (null) and Token Role have access.

        const tablesToFix = [
            { collection: 'embarques', action: 'read', fields: '*' },
            { collection: 'embarques', action: 'update', fields: '*' }, // Needed for Critical Pendencies actions
            { collection: 'vehicle_matches', action: 'read', fields: '*' },
            { collection: 'disponivel', action: 'read', fields: '*' },
            { collection: 'frota', action: 'read', fields: '*' },
            { collection: 'rotas', action: 'read', fields: '*' },
            { collection: 'operational_alerts', action: 'read', fields: '*' },
            { collection: 'cadastro_motorista', action: 'read', fields: '*' }, // Fix for "drivers not appearing"
            { collection: 'cadastro_motorista', action: 'create', fields: '*' },
            { collection: 'cadastro_motorista', action: 'update', fields: '*' }
        ];

        // Helper to check and create permission
        const ensurePermission = async (roleId, tableConf) => {
            // Check existing
            let url = `${DIRECTUS_URL}/permissions?filter[collection][_eq]=${tableConf.collection}&filter[action][_eq]=${tableConf.action}`;
            if (roleId) {
                url += `&filter[role][_eq]=${roleId}`;
            } else {
                url += `&filter[role][_null]=true`;
            }

            const check = await fetch(url, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const checkData = await check.json();

            if (checkData.data && checkData.data.length > 0) {
                console.log(`   ✅ Permission exists: ${tableConf.collection} (${tableConf.action}) for role ${roleId || 'Public'}`);
                // Optional: Update fields if restricted? For now assume existence is enough or we could PATCH.
                // Let's PATCH to ensure fields is '*'
                const permId = checkData.data[0].id;
                await fetch(`${DIRECTUS_URL}/permissions/${permId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields: ['*'] })
                });
            } else {
                console.log(`   ➕ Creating permission: ${tableConf.collection} (${tableConf.action}) for role ${roleId || 'Public'}`);
                const create = await fetch(`${DIRECTUS_URL}/permissions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role: roleId,
                        collection: tableConf.collection,
                        action: tableConf.action,
                        fields: ['*']
                    })
                });
                const createRes = await create.json();
                if (createRes.errors) {
                    console.error(`      ❌ Error creating permission:`, createRes.errors);
                } else {
                    console.log(`      ✨ Created!`);
                }
            }
        };

        // Apply fixes
        console.log('\n3️⃣ Applying Permissions...');

        // Fix for Public (Anonymous Dashboard Access)
        for (const conf of tablesToFix) {
            // We only need READ for public dashboard generally, but let's give requested ones.
            if (conf.action === 'read') {
                await ensurePermission(null, conf); // Public
            }
        }

        // Fix for Token Role (Active User Actions)
        if (tokenRole) {
            for (const conf of tablesToFix) {
                await ensurePermission(tokenRole, conf);
            }
        }

        console.log('\n✅ Permission Fix Complete. Please restart the dashboard or refresh.');

    } catch (err) {
        console.error('❌ Critical Error:', err);
    }
}

fixPermissions();
