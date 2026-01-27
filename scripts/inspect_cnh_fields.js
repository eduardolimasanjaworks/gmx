import { createDirectus, rest, staticToken, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspectFields() {
    try {
        const fields = await client.request(readFields('cnh'));
        const motoristaId = fields.find(f => f.field === 'motorista_id');

        if (motoristaId) {
            console.log("Field: motorista_id");
            console.log("Type:", motoristaId.type);
            console.log("Schema:", motoristaId.schema);
        } else {
            console.log("'motorista_id' not found in 'cnh'.");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

inspectFields();
