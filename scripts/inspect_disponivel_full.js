
import { createDirectus, rest, staticToken, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspect() {
    try {
        const fields = await client.request(readFields('disponivel'));
        console.log("Full Field Analysis for 'disponivel':");
        fields.forEach(f => {
            console.log(`Field: ${f.field}`);
            console.log(`  Type: ${f.type}`);
            console.log(`  Interface: ${f.meta?.interface}`);
            console.log(`  Special: ${f.meta?.special}`);
            console.log('---');
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

inspect();
