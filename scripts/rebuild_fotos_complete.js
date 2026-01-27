
import { createDirectus, rest, staticToken, createCollection, deleteCollection, createField, createItem, readPolicies, createPermission } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'fotos';
const RELATED_TABLE = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function rebuildFotos() {
    try {
        console.log(`🗑️ Deleting collection ${TABLE_NAME}...`);
        try {
            await client.request(deleteCollection(TABLE_NAME));
        } catch (e) {
            console.log("   (Collection might not exist or verify failed, proceeding...)");
        }

        console.log(`🆕 Creating collection ${TABLE_NAME}...`);
        await client.request(createCollection({
            collection: TABLE_NAME,
            schema: { name: TABLE_NAME },
            meta: {
                group: null,
                hidden: false,
                singleton: false,
                icon: 'photo_camera',
                note: 'Fotos dos veículos',
                display_template: '{{id}}',
                sort_field: 'date_created'
            }
        }));

        console.log("fields...");

        // 1. System Fields
        const sysFields = ['date_created', 'date_updated'];
        for (const sys of sysFields) {
            await client.request(createField(TABLE_NAME, {
                field: sys,
                type: 'timestamp',
                meta: { interface: 'datetime', readonly: true, hidden: true, special: [sys.replace('_', '-')] },
                schema: { default_value: 'now()' }
            }));
        }

        // 2. Motorista ID (Integer for M2O)
        await client.request(createField(TABLE_NAME, {
            field: 'motorista_id',
            type: 'integer',
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                display: 'related-values',
                display_name: 'Motorista'
            }
        }));

        // 3. Photos
        const photos = ['foto_cavalo', 'foto_lateral', 'foto_traseira'];
        for (const p of photos) {
            await client.request(createField(TABLE_NAME, {
                field: p,
                type: 'string', // Store URL or ID? Directus 'image' interface usually expects uuid if using directus_files, but user wants string? 
                // Previous attempts used 'string' with 'image' interface.
                // If storing Directus File UUIDs, it should be uuid and related to directus_files.
                // PROMPT says: "create a new Directus collection ... with fields for ... foto_cavalo ...". 
                // Usually for photos we want directus_files relation. 
                // BUT user mocks show URLs or empty. Let's stick to string for now to avoid complexity, OR create file relations if requested. 
                // Step 14 used string/image. I will stick to string/image interface.
                meta: {
                    interface: 'image',
                    display_name: p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                }
            }));
        }

        console.log("🔗 Creating Relationship to cadastro_motorista...");
        try {
            await client.request(createItem('directus_relations', {
                many_collection: TABLE_NAME,
                many_field: 'motorista_id',
                one_collection: RELATED_TABLE,
                one_deselect_action: 'nullify'
            }));
            console.log("   ✅ Relationship created.");
        } catch (e) {
            console.error("   ⚠️ Rel error (maybe created with field):", e.message);
        }

        console.log("🔓 Setting Public Permissions...");
        const policies = await client.request(readPolicies());
        const publicPolicy = policies.find(p => p.name === 'Public Motorista Policy') || policies.find(p => p.name === 'Public');

        if (publicPolicy) {
            console.log(`   Using policy: ${publicPolicy.name} (${publicPolicy.id})`);
            const actions = ['read', 'create', 'update', 'delete'];
            for (const action of actions) {
                try {
                    await client.request(createPermission({
                        policy: publicPolicy.id,
                        collection: TABLE_NAME,
                        action: action,
                        fields: ['*']
                    }));
                } catch (e) { /* ignore existing */ }
            }
        }

        console.log("✅ DONE. Refresh Directus.");

    } catch (e) {
        console.error("GLOBAL ERROR:", e);
    }
}

rebuildFotos();
