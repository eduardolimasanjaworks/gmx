import { createDirectus, rest, staticToken, createCollection, createField, createPermission, readPolicies } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'cnh';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function createCNHTable() {
    console.log(`Creating collection: ${TABLE_NAME}...`);

    try {
        // 1. Create Collection
        await client.request(createCollection({
            collection: TABLE_NAME,
            schema: { name: TABLE_NAME },
            meta: {
                singleton: false,
                sort_field: 'date_created',
                note: 'Tabela de informações da CNH'
            }
        }));
        console.log(`✅ Collection ${TABLE_NAME} created.`);

        // 2. Create User Fields
        const fields = [
            { name: 'cpf', type: 'string', interface: 'input' },
            { name: 'nome', type: 'string', interface: 'input' },
            { name: 'data_nasc', type: 'date', interface: 'date', display: 'Data de Nasc' },
            { name: 'nome_mae', type: 'string', interface: 'input', display: 'Nome Mãe' },
            { name: 'n_registro_cnh', type: 'string', interface: 'input', display: 'N° Registro da CNH' },
            { name: 'n_formulario_cnh', type: 'string', interface: 'input', display: 'N° do Formulario CNH' },
            { name: 'validade', type: 'date', interface: 'date' },
            { name: 'emissao_cnh', type: 'date', interface: 'date', display: 'Emissão CNH' },
            { name: 'n_cnh_seguranca', type: 'string', interface: 'input', display: 'N° CNH Segurança' },
            { name: 'n_cnh_renach', type: 'string', interface: 'input', display: 'N° CNH Renach' },
            { name: 'primeira_habilitacao', type: 'date', interface: 'date', display: '1° Habilitação' },
            { name: 'categoria', type: 'string', interface: 'input' },
            { name: 'cidade_emissao', type: 'string', interface: 'input', display: 'Cidade Emissão' },
            { name: 'link', type: 'string', interface: 'input', display: 'Link' } // Assuming URL string
        ];

        for (const field of fields) {
            console.log(`  Creating field ${field.name}...`);
            try {
                await client.request(createField(TABLE_NAME, {
                    field: field.name,
                    type: field.type,
                    meta: {
                        interface: field.interface,
                        display_name: field.display || field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/_/g, ' ')
                    }
                }));
                console.log(`  ✅ Field ${field.name} created.`);
            } catch (err) {
                console.error(`  ❌ Failed to create field ${field.name}:`, err.message);
            }
        }

        // 3. Create System Fields (CRITICAL)
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
            } catch (err) {
                if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                    // Already exists (sometimes Directus creates them if we are lucky, but usually not via this method)
                }
            }
        }

        // 4. Set Permissions (Public Policy)
        console.log("  Setting Public Permissions...");
        const policies = await client.request(readPolicies());
        const publicPolicy = policies.find(p => p.name === 'Public Motorista Policy'); // Reusing the policy we created

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
                } catch (e) { /* ignore if exists */ }
            }
            console.log("  ✅ Permissions applied.");
        } else {
            console.log("  ⚠️ Public Policy not found. Please check permissions manually.");
        }

    } catch (err) {
        console.error(`❌ Global Error:`, err);
    }
}

createCNHTable();
