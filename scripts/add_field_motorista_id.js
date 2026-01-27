import { createDirectus, rest, staticToken, createField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function addField() {
    console.log("Adding motorista_id to disponivel...");
    try {
        await client.request(createField('disponivel', {
            field: 'motorista_id',
            type: 'integer',
            meta: {
                interface: 'input',
                display_name: 'Motorista ID'
            }
        }));
        console.log("✅ motorista_id created successfully.");
    } catch (err) {
        // Log the useful part of the error
        if (err && err.errors) {
            console.error("❌ Directus Error:", JSON.stringify(err.errors, null, 2));
        } else {
            console.error("❌ Error:", err);
        }
    }
}

addField();
