import { createDirectus, rest, staticToken, readFieldsByCollection } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const fs = require('fs');

async function inspect() {
    try {
        const fields = await client.request(readFieldsByCollection('disponivel'));
        const output = fields.map(f => `- ${f.field} (${f.type})`).join('\n');
        fs.writeFileSync('fields_output.txt', output);
        console.log('Fields written to fields_output.txt');
    } catch (err) {
        console.error(err);
    }
}

inspect();
