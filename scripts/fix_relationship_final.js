
import { createDirectus, rest, staticToken, deleteCollection, createCollection, createField, createRelation, readPolicies, createPermission } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE = 'fotos';
const RELATED_TABLE = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function run() {
    try {
        console.log("🛠️ Starting clean setup for 'fotos'...");

        // 1. DELETE EXISTING
        try {
            await client.request(deleteCollection(TABLE));
            console.log("🗑️ Deleted old 'fotos' collection.");
        } catch (e) {
            console.log("   (Collection didn't exist)");
        }

        // 2. CREATE COLLECTION
        await client.request(createCollection({
            collection: TABLE,
            schema: { name: TABLE },
            meta: {
                icon: 'photo_camera',
                note: 'Fotos dos veículos',
                display_template: '{{motorista_id}}', // temporary
                hidden: false,
                archive_field: 'status',
                sort_field: 'date_created'
            }
        }));
        console.log("✅ Collection created.");


        // 3. CREATE SYSTEM FIELDS
        // id is created by default by createCollection usually.
        // await client.request(createField(TABLE, { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } }));

        try { await client.request(createField(TABLE, { field: 'status', type: 'string', schema: { default_value: 'published' }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Published', value: 'published' }, { text: 'Draft', value: 'draft' }] } } })); } catch (e) { }

        await client.request(createField(TABLE, { field: 'date_created', type: 'timestamp', schema: { default_value: 'now()' }, meta: { special: ['date-created'], interface: 'datetime', readonly: true, hidden: true } }));
        await client.request(createField(TABLE, { field: 'date_updated', type: 'timestamp', schema: { default_value: 'now()' }, meta: { special: ['date-updated'], interface: 'datetime', readonly: true, hidden: true } }));

        // 4. CREATE CONTENT FIELDS
        const images = ['foto_cavalo', 'foto_lateral', 'foto_traseira'];
        for (const img of images) {
            await client.request(createField(TABLE, {
                field: img,
                type: 'string',
                meta: { interface: 'image', display_name: img.replace('_', ' ') }
            }));
        }
        console.log("✅ Fields created.");

        // 5. CREATE FIELD WITHOUT RELATION FIRST
        // We create the field as an integer first.
        await client.request(createField(TABLE, {
            field: 'motorista_id',
            type: 'integer',
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                display: 'related-values',
                display_name: 'Identificação de Motorista'
            }
        }));

        // 6. CREATE RELATION (PROPERLY)
        // This endpoint creates the entry in directus_relations AND adds the Foreign Key to the DB
        console.log("🔗 Establish Relation...");
        await client.request(createRelation({
            collection: TABLE,
            field: 'motorista_id',
            related_collection: RELATED_TABLE,
            schema: {
                // This ensures DB constraint
                on_delete: 'SET NULL'
            },
            meta: {
                // This ensures UI configuration
                many_collection: TABLE,
                many_field: 'motorista_id',
                one_collection: RELATED_TABLE,
                one_collection_field: null, // No field on the driver side needed
                one_deselect_action: 'nullify',
                sort_field: null
            }
        }));
        console.log("✅ Relation and FK established.");

        // 7. PERMISSIONS
        const policies = await client.request(readPolicies());
        const publicPolicy = policies.find(p => p.name === 'Public Motorista Policy') || policies.find(p => p.name === 'Public');
        if (publicPolicy) {
            for (const action of ['read', 'create', 'update', 'delete']) {
                try {
                    await client.request(createPermission({
                        policy: publicPolicy.id,
                        collection: TABLE,
                        action: action,
                        fields: ['*']
                    }));
                } catch (e) { }
            }
            console.log("🔓 Permissions granted.");
        }

    } catch (e) {
        console.error("❌ ERROR:", e);
        if (e.errors) console.error(JSON.stringify(e.errors, null, 2));
    }
}

run();
