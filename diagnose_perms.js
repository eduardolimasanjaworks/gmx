
// Node 18+ has native fetch

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = 'EQ35A8-16012024-VELOZ';

async function checkPermissions() {
    try {
        console.log('Checking permissions...');

        // 1. Get Public Role
        const rolesRes = await fetch(`${DIRECTUS_URL}/roles`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const rolesData = await rolesRes.json();

        // Directus usually has a null role for public, or we might see a named "Public" role
        // But actually, permissions with role=null are public. Let's check permissions directly.

        console.log('\n--- Checking Permissions Table directly ---');
        const permRes = await fetch(`${DIRECTUS_URL}/permissions?limit=200`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const permData = await permRes.json();

        if (permData.errors) {
            console.error('Error fetching permissions:', permData.errors);
            return;
        }

        const publicPerms = permData.data.filter(p => p.role === null);

        console.log(`Found ${publicPerms.length} PUBLIC permissions (role: null).`);

        const tables = ['embarques', 'vehicle_matches', 'disponivel', 'frota', 'rotas'];

        tables.forEach(table => {
            const tablePerms = publicPerms.filter(p => p.collection === table);
            if (tablePerms.length > 0) {
                console.log(`\n✅ ${table}:`);
                tablePerms.forEach(p => console.log(`   - Action: ${p.action} | Fields: ${p.fields}`));
            } else {
                console.log(`\n❌ ${table}: No public permissions found.`);
            }
        });

    } catch (err) {
        console.error('Script failed:', err);
    }
}

checkPermissions();
