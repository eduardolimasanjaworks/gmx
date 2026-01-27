import { createDirectus, rest, staticToken, createCollection, createField, createPermission, readPolicies } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'status';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function createStatusTable() {
    console.log(`Creating collection: ${TABLE_NAME}...`);

    try {
        // 1. Create Collection
        await client.request(createCollection({
            collection: TABLE_NAME,
            schema: { name: TABLE_NAME },
            meta: {
                singleton: false,
                sort_field: 'date_created',
                note: 'Tabela de status e gerenciamento de risco (GR)'
            }
        }));
        console.log(`✅ Collection ${TABLE_NAME} created.`);

        // 2. Create User Fields
        const fields = [
            { name: 'venc_gr', type: 'date', interface: 'date', display: 'VENC GR' },
            {
                name: 'status_gr', type: 'string', interface: 'select-dropdown', display: 'STATUS GR',
                options: {
                    choices: [
                        { text: 'Aprovado', value: 'aprovado' },
                        { text: 'Reprovado', value: 'reprovado' },
                        { text: 'Em Análise', value: 'em_analise' },
                        { text: 'Vencido', value: 'vencido' }
                    ]
                }
            },
            { name: 'inf_complementares', type: 'text', interface: 'textarea', display: 'INF. COMPLEMENTARES' }
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
                        options: field.options
                    }
                }));
                console.log(`  ✅ Field ${field.name} created.`);
            } catch (err) {
                console.error(`  ❌ Failed to create field ${field.name}:`, err.message);
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
            } catch (err) { /* ignore */ }
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
                } catch (e) { /* ignore */ }
            }
            console.log("  ✅ Permissions applied.");
        }

    } catch (err) {
        console.error(`❌ Global Error:`, err);
    }
}

createStatusTable();
