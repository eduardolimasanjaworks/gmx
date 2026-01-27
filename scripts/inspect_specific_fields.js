
import { createDirectus, rest, staticToken, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspect() {
    try {
        const fields = await client.request(readFields('disponivel'));
        const relevant = fields.filter(f =>
            f.field.includes('user') ||
            f.field.includes('creat') ||
            f.field.includes('obs') ||
            f.field.includes('lat') ||
            f.field.includes('lon') ||
            f.field.includes('operador')
        ).map(f => ({ name: f.field, type: f.type }));

        console.log("Relevant Fields:", relevant);
    } catch (e) {
        console.error("Error:", e);
    }
}

inspect();
