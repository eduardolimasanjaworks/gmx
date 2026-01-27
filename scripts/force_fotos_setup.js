import { createDirectus, rest, staticToken, createCollection, deleteCollection, createField, createPermission, readPolicies, createItem } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'fotos';
const RELATED_TABLE = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function setupFotos() {
    console.log(`🚀 Starting setup for ${TABLE_NAME}...`);

    try {
        // 1. DELETE EXISTING (Clean slate)
        console.log(`1. Deleting existing ${TABLE_NAME} collection (if any)...`);
        try {
            await client.request(deleteCollection(TABLE_NAME));
            console.log("   ✅ Deleted.");
        } catch (e) {
            console.log("   ℹ️ Not found (ok).");
        }

        // 2. CREATE COLLECTION
        console.log(`2. Creating ${TABLE_NAME} collection...`);
        await client.request(createCollection({
            collection: TABLE_NAME,
            schema: { name: TABLE_NAME },
            meta: {
                singleton: false,
                sort_field: 'date_created',
                note: 'Tabela de fotos do veículo'
            }
        }));
        console.log("   ✅ Created.");

        // 3. CREATE FIELDS
        console.log("3. Creating fields...");

        // 3.1 Motorista ID (The crucial one)
        await client.request(createField(TABLE_NAME, {
            field: 'motorista_id',
            type: 'integer',
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                display: 'related-values',
                display_name: 'Motorista',
                required: false
            },
            schema: {
                // Ensure the database knows this is a Foreign Key
                foreign_key_table: RELATED_TABLE,
                foreign_key_column: 'id',
                comment: 'Link to Motorista'
            }
        }));
        console.log("   ✅ Field 'motorista_id' created.");

        // 3.2 Image fields
        const imgFields = ['foto_cavalo', 'foto_lateral', 'foto_traseira'];
        for (const fName of imgFields) {
            await client.request(createField(TABLE_NAME, {
                field: fName,
                type: 'string',
                meta: {
                    interface: 'image',
                    display_name: fName.replace('foto_', 'Foto ').replace(/\b\w/g, l => l.toUpperCase())
                }
            }));
            console.log(`   ✅ Field '${fName}' created.`);
        }

        // 3.3 System fields
        await client.request(createField(TABLE_NAME, {
            field: 'date_created',
            type: 'timestamp',
            meta: { interface: 'datetime', readonly: true, hidden: true, special: ['date-created'] },
            schema: { default_value: 'now()' }
        }));
        await client.request(createField(TABLE_NAME, {
            field: 'date_updated',
            type: 'timestamp',
            meta: { interface: 'datetime', readonly: true, hidden: true, special: ['date-updated'] },
            schema: { default_value: 'now()' }
        }));


        /* 
           4. CREATE RELATIONSHIP (System Record)
           This is often done automatically if 'schema.foreign_key_table' is set during createField,
           BUT creating it explicitly in directus_relations helps Directus UI understand strictly.
        */
        console.log("4. Configuring relationship in directus_relations...");
        try {
            /* 
               Checking if it already exists implicitly before creating.
               (Implicit creation might happen because of foreign_key_table in schema above)
               If not, we create it.
            */
            await client.request(createItem('directus_relations', {
                many_collection: TABLE_NAME,
                many_field: 'motorista_id',
                one_collection: RELATED_TABLE,
                // optional but good
                one_field: null,
                one_collection_field: null,
                one_allowed_collections: null,
                junction_field: null,
                sort_field: null,
                one_deselect_action: 'nullify'
            }));
            console.log("   ✅ Relationship record created.");
        } catch (err) {
            // Error code for "Unique constraint" or similar means it was auto-created
            console.log("   ℹ️ Relationship might have been auto-created or error:", err.message);
        }

        // 5. PERMISSIONS
        console.log("5. Setting public permissions...");
        const policies = await client.request(readPolicies());
        const publicPolicy = policies.find(p => p.name === 'Public Motorista Policy');
        if (publicPolicy) {
            const actions = ['read', 'create', 'update', 'delete'];
            for (const action of actions) {
                try {
                    await client.request(createPermission({
                        policy: publicPolicy.id,
                        collection: TABLE_NAME,
                        action: action,
                        fields: ['*']
                    }));
                } catch (e) { }
            }
            console.log("   ✅ Permissions applied.");
        }

        console.log("🏁 DONE! Refresh Directus and check 'Fotos'.");

    } catch (err) {
        console.error("❌ CRITICAL ERROR:", err);
    }
}

setupFotos();
