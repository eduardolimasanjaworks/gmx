
import { createDirectus, rest, staticToken, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function checkFields() {
    try {
        const fields = await client.request(readFields('disponivel'));
        const fieldNames = fields.map(f => f.field);

        console.log("Checking for location fields...");
        console.log("Has 'local_disponibilidade'?", fieldNames.includes('local_disponibilidade'));
        console.log("Has 'localizacao_atual'?", fieldNames.includes('localizacao_atual'));
        console.log("Has 'cidade_atual'?", fieldNames.includes('cidade_atual'));

    } catch (e) {
        console.error("Error:", e);
    }
}

checkFields();
