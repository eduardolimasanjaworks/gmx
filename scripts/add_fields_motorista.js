
import { createDirectus, rest, staticToken, createField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function addFields() {
    console.log(`Adding fields to ${TABLE_NAME}...`);

    const fieldsToAdd = [
        { name: 'cpf', type: 'string', interface: 'input', display: 'CPF' },
        { name: 'cidade', type: 'string', interface: 'input', display: 'Cidade' },
        { name: 'estado', type: 'string', interface: 'input', display: 'Estado' }, // Could be dropdown later
    ];

    for (const field of fieldsToAdd) {
        try {
            console.log(`Creating field ${field.name}...`);
            await client.request(createField(TABLE_NAME, {
                field: field.name,
                type: field.type,
                meta: {
                    interface: field.interface,
                    display_name: field.display,
                    width: 'half'
                }
            }));
            console.log(`✅ Field ${field.name} created.`);
        } catch (err) {
            if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE' || err?.errors?.[0]?.code === 'INVALID_PAYLOAD') {
                console.log(`⚠️ Field ${field.name} already exists or issue.`);
            } else {
                console.error(`❌ Error creating ${field.name}:`, err);
            }
        }
    }
}

addFields();
