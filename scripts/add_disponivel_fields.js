
import { createDirectus, rest, staticToken, createField, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function addFields() {
    try {
        const currentFields = await client.request(readFields('disponivel'));
        const existing = new Set(currentFields.map(f => f.field));

        if (!existing.has('observacao')) {
            console.log("Creating 'observacao'...");
            await client.request(createField('disponivel', {
                field: 'observacao',
                type: 'text',
                meta: { interface: 'input-multiline', width: 'full' }
            }));
        } else { console.log("'observacao' already exists."); }

        if (!existing.has('latitude')) {
            console.log("Creating 'latitude'...");
            await client.request(createField('disponivel', {
                field: 'latitude',
                type: 'float',
                meta: { interface: 'input', width: 'half' }
            }));
        } else { console.log("'latitude' already exists."); }

        if (!existing.has('longitude')) {
            console.log("Creating 'longitude'...");
            await client.request(createField('disponivel', {
                field: 'longitude',
                type: 'float',
                meta: { interface: 'input', width: 'half' }
            }));
        } else { console.log("'longitude' already exists."); }

    } catch (e) {
        console.error("Error:", e);
    }
}

addFields();
