import { createDirectus, rest, staticToken, createCollection, createField, createPermission, readPolicies } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const TABLES = ['carreta_1', 'carreta_2', 'carreta_3'];

async function createCarretasTables() {

    for (const tableName of TABLES) {
        console.log(`\n--- Processing ${tableName} ---`);

        try {
            // 1. Create Collection
            await client.request(createCollection({
                collection: tableName,
                schema: { name: tableName },
                meta: {
                    singleton: false,
                    sort_field: 'date_created',
                    note: `Tabela de informações da ${tableName}`
                }
            }));
            console.log(`✅ Collection ${tableName} created.`);

            // 2. Create User Fields
            const fields = [
                { name: 'cap', type: 'string', interface: 'input', display: 'CAP' },
                { name: 'cnpj_cpf_proprietario', type: 'string', interface: 'input', display: 'CNPJ/CPF (Proprietário)' },
                { name: 'proprietario_documento', type: 'string', interface: 'input', display: 'Nome Proprietário Documento' },
                { name: 'cep', type: 'string', interface: 'input', display: 'CEP' },
                { name: 'renavam', type: 'string', interface: 'input', display: 'Renavam' },
                { name: 'modelo', type: 'string', interface: 'input', display: 'Modelo' },
                { name: 'ano_fabricacao', type: 'integer', interface: 'input', display: 'Ano Fabricação' },
                { name: 'ano_modelo', type: 'integer', interface: 'input', display: 'Ano Modelo' },
                { name: 'nr_certificado_doc', type: 'string', interface: 'input', display: 'Nr. Certificado Doc' },
                { name: 'exercicio_doc', type: 'integer', interface: 'input', display: 'Exercício Doc' },
                { name: 'cor', type: 'string', interface: 'input', display: 'Cor' },
                { name: 'chassi', type: 'string', interface: 'input', display: 'Chassi' },
                { name: 'cidade_emplacado', type: 'string', interface: 'input', display: 'Cidade Emplacado' },

                // ANTT Block
                { name: 'antt_numero', type: 'string', interface: 'input', display: 'Número ANTT' },
                { name: 'antt_cnpj_cpf', type: 'string', interface: 'input', display: 'ANTT - CNPJ/CPF' },
                { name: 'antt_nome', type: 'string', interface: 'input', display: 'ANTT - Nome' }
            ];

            for (const field of fields) {
                console.log(`  Creating field ${field.name}...`);
                try {
                    await client.request(createField(tableName, {
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
                try {
                    await client.request(createField(tableName, {
                        field: sysField,
                        type: 'timestamp',
                        meta: { interface: 'datetime', readonly: true, hidden: true, special: [sysField.replace('_', '-')] },
                        schema: { default_value: 'now()' }
                    }));
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
                            collection: tableName,
                            action: action,
                            fields: ['*']
                        }));
                    } catch (e) { /* ignore */ }
                }
                console.log("  ✅ Permissions applied.");
            }

        } catch (err) {
            console.error(`❌ Global Error for ${tableName}:`, err);
        }
    }
}

createCarretasTables();
