
import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspect() {
    try {
        const fields = await client.request(readItems('directus_fields', {
            filter: { collection: { _eq: 'disponivel' } },
            fields: ['field', 'type']
        }));

        console.log("Fields found:", fields.map(f => f.field));
    } catch (e) {
        console.error("Error:", e);
    }
}

inspect();
