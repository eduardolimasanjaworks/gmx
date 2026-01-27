
import { createDirectus, rest, staticToken, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspect() {
    try {
        const fields = await client.request(readFields(TABLE));
        console.log(`Fields in ${TABLE}:`);
        fields.forEach(f => console.log(`- ${f.field} [${f.type}]`));
    } catch (e) {
        console.error(e);
    }
}
inspect();
