import { createDirectus, rest, staticToken, createField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const TABLE_NAME = 'cadastro_motorista';

async function addStatusField() {
    console.log(`Adding status_logistica field to ${TABLE_NAME}...`);

    try {
        await client.request(createField(TABLE_NAME, {
            field: 'status_logistica',
            type: 'string',
            meta: {
                interface: 'select-dropdown',
                display_name: 'Status Logística',
                options: {
                    choices: [
                        { text: 'Disponível', value: 'disponivel', color: '#22C55E' },
                        { text: 'Indisponível', value: 'indisponivel', color: '#EF4444' }
                    ]
                }
            },
            schema: {
                default_value: 'indisponivel'
            }
        }));
        console.log(`✅ Field status_logistica created.`);
    } catch (err) {
        console.error(`❌ Failed to create field:`, err.message);
    }
}

addStatusField();
