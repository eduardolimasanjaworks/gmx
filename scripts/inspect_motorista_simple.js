import { createDirectus, rest, staticToken, readFieldsByCollection } from '@directus/sdk';
import fs from 'fs';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspect() {
    try {
        const fields = await client.request(readFieldsByCollection('cadastro_motorista'));
        const output = fields.map(f => `- ${f.field} (${f.type})`).join('\n');
        fs.writeFileSync('motorista_fields.txt', output);
        console.log("Campos salvos em motorista_fields.txt");
    } catch (err) {
        console.error(err);
    }
}

inspect();
