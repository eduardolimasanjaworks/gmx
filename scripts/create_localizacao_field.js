
import { createDirectus, rest, staticToken, createField, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function addField() {
    try {
        console.log("Checking for 'localizacao_atual' field...");
        const fields = await client.request(readFields('disponivel'));
        const exists = fields.some(f => f.field === 'localizacao_atual');

        if (!exists) {
            console.log("Creating 'localizacao_atual' field...");
            await client.request(createField('disponivel', {
                field: 'localizacao_atual',
                type: 'string', // text
                meta: {
                    interface: 'input',
                    display: 'raw',
                    special: null,
                    width: 'full'
                }
            }));
            console.log("✅ Field created successfully.");
        } else {
            console.log("⚠️ Field already exists.");
        }

    } catch (e) {
        console.error("Error creating field:", e);
    }
}

addField();
