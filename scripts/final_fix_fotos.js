import { createDirectus, rest, staticToken, readFields, createCollection, deleteCollection, createField, createPermission, readPolicies, createItem } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'fotos';
const RELATED_TABLE = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function run() {
    try {
        console.log("🔍 Checking ID type of 'cadastro_motorista'...");
        const fields = await client.request(readFields(RELATED_TABLE));
        const idField = fields.find(f => f.field === 'id');

        if (!idField) {
            console.error("❌ CRITICAL: 'id' field not found in cadastro_motorista!");
            return;
        }

        console.log(`TYPE DETECTED: ${idField.schema?.data_type || idField.type}`);
        // If it's integer, we use integer. If uuid, string/uuid.
        const idType = (idField.schema?.data_type === 'integer' || idField.type === 'integer') ? 'integer' : 'uuid';
        console.log(`👉 Derived type for FK: ${idType}`);

        // --- RESET TABLE ---
        console.log(`\nDeleting ${TABLE_NAME}...`);
        try { await client.request(deleteCollection(TABLE_NAME)); } catch (e) { }

        console.log(`Creating ${TABLE_NAME}...`);
        await client.request(createCollection({
            collection: TABLE_NAME,
            schema: { name: TABLE_NAME }
        }));

        // --- CREATE FIELDS ---
        console.log("Creating fields...");

        // 1. motorista_id (The FK)
        // Note: We do NOT define foreign_key_* props in schema here directly to avoid conflicts with manual relation creation,
        // OR we do it exactly right. Let's try creating the field pure first, then the relation.
        await client.request(createField(TABLE_NAME, {
            field: 'motorista_id',
            type: idType === 'integer' ? 'integer' : 'string', // 'uuid' often uses string type in Directus API creation
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                display: 'related-values',
                display_name: 'Motorista'
            }
        }));

        const imgFields = ['foto_cavalo', 'foto_lateral', 'foto_traseira'];
        for (const img of imgFields) {
            await client.request(createField(TABLE_NAME, {
                field: img,
                type: 'string',
                meta: { interface: 'image', display_name: img }
            }));
        }

        // --- CREATE RELATION ---
        // This is the manual insertion into directus_relations
        console.log("\n🔗 Creating Relationship Record...");
        try {
            const relPayload = {
                many_collection: TABLE_NAME,
                many_field: 'motorista_id',
                one_collection: RELATED_TABLE,
                one_field: null, // No One-to-Many reverse field needed
                one_collection_field: null,
                one_allowed_collections: null,
                junction_field: null,
                sort_field: null,
                one_deselect_action: 'nullify'
            };

            await client.request(createItem('directus_relations', relPayload));
            console.log("✅ Relationship created successfully via directus_relations.");
        } catch (rErr) {
            console.error("❌ Failed to create relationship:", rErr.message);
            if (rErr.errors) console.error(JSON.stringify(rErr.errors, null, 2));
        }

        // --- PERMISSIONS ---
        console.log("\n🔓 Setting Permissions...");
        const policies = await client.request(readPolicies());
        const publicPolicy = policies.find(p => p.name === 'Public Motorista Policy');
        if (publicPolicy) {
            for (const action of ['read', 'create', 'update', 'delete']) {
                try {
                    await client.request(createPermission({
                        policy: publicPolicy.id,
                        collection: TABLE_NAME,
                        action: action,
                        fields: ['*']
                    }));
                } catch (e) { }
            }
            console.log("✅ Permissions set.");
        }

        console.log("Done.");

    } catch (error) {
        console.error("GLOBAL ERROR:", error);
    }
}

run();
