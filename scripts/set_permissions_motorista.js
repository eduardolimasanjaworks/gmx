import { createDirectus, rest, staticToken, createPermission, readRoles } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function setPermissions() {
    console.log(`Setting Public Permissions for: ${TABLE_NAME}...`);

    try {
        // 1. Get Public Role ID
        const roles = await client.request(readRoles());
        // Directus usually doesn't expose the "Public" role in the standard roles list easily via API unless we query for null name or specific ID, 
        // BUT the standard way to set public permissions is to use 'null' as role in createPermission.

        // Actions needed: create, read, update, delete (CRU) - User asked for visualization and edition.
        const actions = ['read', 'create', 'update', 'delete'];

        for (const action of actions) {
            console.log(`  Granting ${action} permission...`);
            try {
                await client.request(createPermission({
                    role: null, // null = Public Role
                    collection: TABLE_NAME,
                    action: action,
                    permissions: {}, // Full access, no field restrictions
                    validation: {} // No validation rules
                }));
                console.log(`  ✅ ${action} granted.`);
            } catch (err) {
                // Usually errors if permission already exists
                if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                    console.log(`  ⚠️ ${action} already granted.`);
                } else {
                    console.error(`  ❌ Failed to grant ${action}:`, err.message);
                }
            }
        }

        console.log('✨ Permissions updated!');

    } catch (err) {
        console.error('Global Error:', err);
    }
}

setPermissions();
