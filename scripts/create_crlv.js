import { createDirectus, rest, staticToken, createCollection, createField, createPermission, readPolicies } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'crlv';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function createCRLVTable() {
    console.log(`Creating collection: ${TABLE_NAME}...`);

    try {
        // 1. Create Collection
        await client.request(createCollection({
            collection: TABLE_NAME,
            schema: { name: TABLE_NAME },
            meta: {
                singleton: false,
                sort_field: 'date_created',
                note: 'Tabela de informações do CRLV (Veículo)'
            }
        }));
        console.log(`✅ Collection ${TABLE_NAME} created.`);

        // 2. Create User Fields
        const fields = [
            { name: 'placa_cavalo', type: 'string', interface: 'input', display: 'Placa Cavalo' },
            { name: 'cnpj_cpf', type: 'string', interface: 'input', display: 'CNPJ/CPF' },
            { name: 'nome_proprietario', type: 'string', interface: 'input', display: 'Nome do Proprietário' },
            { name: 'renavam', type: 'string', interface: 'input', display: 'Renavam' },
            { name: 'modelo', type: 'string', interface: 'input', display: 'Modelo' },
            { name: 'ano_fabricacao', type: 'integer', interface: 'input', display: 'Ano Fabricação' },
            { name: 'ano_modelo', type: 'integer', interface: 'input', display: 'Ano Modelo' },
            { name: 'nr_certificado', type: 'string', interface: 'input', display: 'Nr. Certificado' },
            { name: 'exercicio_doc', type: 'integer', interface: 'input', display: 'Exercício Doc' }, // Usually a year like 2024
            { name: 'cor', type: 'string', interface: 'input', display: 'Cor' },
            { name: 'chassi', type: 'string', interface: 'input', display: 'Chassi' },
            { name: 'cidade_emplacado', type: 'string', interface: 'input', display: 'Cidade Emplacado' },
            { name: 'link', type: 'string', interface: 'input', display: 'Link' }
        ];

        for (const field of fields) {
            console.log(`  Creating field ${field.name}...`);
            try {
                await client.request(createField(TABLE_NAME, {
                    field: field.name,
                    type: field.type,
                    meta: {
                        interface: field.interface,
                        display_name: field.display || field.name
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

createCRLVTable();
