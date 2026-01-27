
import { createDirectus, rest, staticToken, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspect() {
    try {
        const fields = await client.request(readFields('disponivel'));
        console.log("--- Fields in 'disponivel' ---");
        fields.forEach(f => {
            console.log(`- ${f.field} (${f.type})`);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

inspect();
