import { createDirectus, rest, staticToken, createCollection, createField, createPermission, readPolicies } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const TABLE_NAME = 'disponivel';

async function createDisponivelTable() {
    console.log(`\n--- Processing ${TABLE_NAME} ---`);

    try {
        // 1. Create Collection
        try {
            await client.request(createCollection({
                collection: TABLE_NAME,
                schema: { name: TABLE_NAME },
                meta: {
                    singleton: false,
                    sort_field: 'date_created',
                    note: `Tabela de disponibilidade`
                }
            }));
            console.log(`✅ Collection ${TABLE_NAME} created.`);
        } catch (error) {
            if (error?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                console.log(`⚠️ Collection ${TABLE_NAME} already exists. Skipping creation.`);
            } else {
                throw error;
            }
        }

        // 2. Create User Fields
        const fields = [
            { name: 'operador', type: 'string', interface: 'input', display: 'Operador' },
            { name: 'data_contato', type: 'timestamp', interface: 'datetime', display: 'Data Contato' },
            { name: 'local_disponibilidade', type: 'string', interface: 'input', display: 'Local Disponibilidade' },
            { name: 'data_previsao_disponibilidade', type: 'timestamp', interface: 'datetime', display: 'Data Previsão Disponibilidade' },
            { name: 'status', type: 'string', interface: 'input', display: 'Status' },
            { name: 'observacao', type: 'text', interface: 'input-multiline', display: 'Observação' },
            { name: 'longitude', type: 'float', interface: 'input', display: 'Longitude' },
            { name: 'latitude', type: 'float', interface: 'input', display: 'Latitude' },
            // New field
            { name: 'motorista_id', type: 'integer', interface: 'input', display: 'Motorista ID' }
        ];

        for (const field of fields) {
            console.log(`  Creating field ${field.name}...`);
            try {
                await client.request(createField(TABLE_NAME, {
                    field: field.name,
                    type: field.type,
                    meta: {
                        interface: field.interface,
                        display_name: field.display || field.name,
                        special: null
                    }
                }));
                console.log(`  ✅ Field ${field.name} created.`);
            } catch (err) {
                if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE' || err?.errors?.[0]?.code === 'INVALID_PAYLOAD') {
                    // INVALID_PAYLOAD often happens if field exists but with different config, or sometimes regular partial fail
                    // But usually RECORD_NOT_UNIQUE is the one.
                    console.log(`  ⚠️ Field ${field.name} already exists or invalid.`);
                } else {
                    console.error(`  ❌ Failed to create field ${field.name}:`, err.message);
                }
            }
        }

        // 3. Create System Fields
        const systemFields = ['date_created', 'date_updated'];
        for (const sysField of systemFields) {
            try {
                await client.request(createField(TABLE_NAME, {
                    field: sysField,
                    type: 'timestamp',
                    meta: { interface: 'datetime', readonly: true, hidden: true, special: [sysField.replace('_', '-')] },
                    schema: { default_value: 'now()' }
                }));
                console.log(`  ✅ System Field ${sysField} created.`);
            } catch (err) {
                if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                    console.log(`  ⚠️ System Field ${sysField} already exists.`);
                }
            }
        }

        // 4. Set Permissions
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
                } catch (e) {
                    // Ignore if permission already exists
                }
            }
            console.log("  ✅ Permissions applied.");
        } else {
            console.warn("  ⚠️ 'Public Motorista Policy' not found. Permissions might not be set.");
        }

    } catch (err) {
        console.error(`❌ Global Error for ${TABLE_NAME}:`, err);
    }
}

createDisponivelTable();
