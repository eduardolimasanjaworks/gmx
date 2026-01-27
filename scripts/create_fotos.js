import { createDirectus, rest, staticToken, createCollection, deleteCollection, createField, createPermission, readPolicies, createItem } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'fotos';
const RELATED_TABLE = 'cadastro_motorista'; // Tabela de motoristas

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function createFotosTable() {
    console.log(`Re-creating collection: ${TABLE_NAME}...`);

    try {
        // 0. Delete if exists (Cleanup)
        try {
            await client.request(deleteCollection(TABLE_NAME));
            console.log(`🗑️ Old collection ${TABLE_NAME} deleted.`);
        } catch (e) {
            // ignore if not found
        }

        // 1. Create Collection
        await client.request(createCollection({
            collection: TABLE_NAME,
            schema: { name: TABLE_NAME },
            meta: {
                singleton: false,
                sort_field: 'date_created',
                note: 'Tabela de fotos do veículo (cavalo)'
            }
        }));
        console.log(`✅ Collection ${TABLE_NAME} created.`);

        // 2. Create User Fields
        const fields = [
            {
                name: 'motorista_id',
                type: 'integer',
                meta: {
                    interface: 'select-dropdown-m2o',
                    special: ['m2o'], // Important: Mark as M2O
                    display: 'related-values', // Show related values in table
                    display_name: 'Motorista'
                }
            },
            { name: 'foto_cavalo', type: 'string', interface: 'image', display: 'Foto Cavalo' },
            { name: 'foto_lateral', type: 'string', interface: 'image', display: 'Foto Lateral' },
            { name: 'foto_traseira', type: 'string', interface: 'image', display: 'Foto Traseira' }
        ];

        for (const field of fields) {
            console.log(`  Creating field ${field.name}...`);
            try {
                // Prepare the payload (handle different structures for motorista_id vs others)
                const meta = field.meta || {
                    interface: field.interface,
                    display_name: field.display || field.name
                };

                await client.request(createField(TABLE_NAME, {
                    field: field.name,
                    type: field.type,
                    meta: meta
                }));
                console.log(`  ✅ Field ${field.name} created.`);
            } catch (err) {
                console.error(`  ❌ Failed to create field ${field.name}:`, err.message);
            }
        }

        // 2.5 Create Relationship to cadastro_motorista
        console.log("  Linking to cadastro_motorista...");
        try {
            await client.request(createItem('directus_relations', {
                many_collection: TABLE_NAME,
                many_field: 'motorista_id',
                one_collection: RELATED_TABLE,
                one_field: null, // One-to-Many doesn't necessarily need a field on the parent for M2O side
                // Template determines what is shown in the dropdown. 
                // We want to show the name and surname if possible, e.g. "{{nome}} {{sobrenome}}"
                one_collection_field: null,
                one_allowed_collections: null,
                junction_field: null,
            }));
            console.log("  ✅ Relationship established.");
        } catch (err) {
            // It might fail if already exists (unlikely after deleteCollection) or validation error
            console.error("  ⚠️ Rel error:", err.message);
        }

        // Update the field to set the display template if needed (optional but good for UX)
        /*
        await client.request(updateField(TABLE_NAME, 'motorista_id', {
            meta: {
                display: 'related-values',
                display_options: { template: '{{nome}} {{sobrenome}}' }
            }
        }));
        */

        // 3. Create System Fields
        const systemFields = ['date_created', 'date_updated'];
        for (const sysField of systemFields) {
            console.log(`  Creating system field ${sysField}...`);
            try {
                await client.request(createField(TABLE_NAME, {
                    field: sysField,
                    type: 'timestamp',
                    meta: { interface: 'datetime', readonly: true, hidden: true, special: [sysField.replace('_', '-')] },
                    schema: { default_value: 'now()' }
                }));
                console.log(`  ✅ System Field ${sysField} created.`);
            } catch (err) { /* ignore */ }
        }

        // 4. Set Permissions
        console.log("  Setting Public Permissions...");
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
                } catch (e) { /* ignore */ }
            }
            console.log("  ✅ Permissions applied.");
        }

    } catch (err) {
        console.error(`❌ Global Error:`, err);
    }
}

createFotosTable();
