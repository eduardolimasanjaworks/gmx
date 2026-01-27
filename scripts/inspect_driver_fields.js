
import { createDirectus, rest, staticToken, readFields } from '@directus/sdk';
import fs from 'fs';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspect() {
    try {
        const fields = await client.request(readFields('cadastro_motorista'));
        // Filter for aliases or relations
        const aliases = fields.filter(f => f.meta?.special?.includes('o2m') || f.meta?.interface?.includes('o2m') || f.meta?.interface === 'list-o2m');

        let output = "";
        aliases.forEach(f => {
            output += `Field: ${f.field}\n`;
            output += `   Type: ${f.type}\n`;
            output += `   Special: ${JSON.stringify(f.meta?.special)}\n`;
            output += `   Interface: ${f.meta?.interface}\n`;
        });
        fs.writeFileSync('driver_fields.txt', output);
        console.log("Written to driver_fields.txt");

    } catch (e) {
        console.error("Error:", e);
    }
}

inspect();
