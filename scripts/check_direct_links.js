
import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function checkDirect() {
    try {
        console.log("Checking Driver ID 12...");

        // 1. Check Fotos
        const fotos = await client.request(readItems('fotos', {
            filter: { motorista_id: { _eq: 12 } }
        }));
        console.log(`FOTOS Linked: ${fotos.length}`);

        // 2. Check Carreta 1 (carreta_1)
        const c1 = await client.request(readItems('carreta_1', {
            filter: { motorista_id: { _eq: 12 } }
        }));
        console.log(`CARRETA 1 Linked: ${c1.length}`);

        // 3. Check CNH
        const cnh = await client.request(readItems('cnh', {
            filter: { motorista_id: { _eq: 12 } }
        }));
        console.log(`CNH Linked: ${cnh.length}`);

    } catch (e) {
        console.error("Error:", e);
    }
}

checkDirect();
