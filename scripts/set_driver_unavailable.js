
import { createDirectus, rest, staticToken, readItems, updateItem } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function makeUnavailable() {
    try {
        console.log("Searching for a 'disponivel' driver to remove...");
        const items = await client.request(readItems('disponivel', {
            filter: { status: { _eq: 'disponivel' } },
            limit: 1
        }));

        if (items.length > 0) {
            const item = items[0];
            console.log(`Found record ID: ${item.id} (Driver ID: ${item.motorista_id})`);
            console.log("Setting status to 'indisponivel'...");

            await client.request(updateItem('disponivel', item.id, {
                status: 'indisponivel'
            }));

            console.log("✅ Done! Driver should disappear from the list.");
        } else {
            console.log("⚠️ No available drivers found to test.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

makeUnavailable();
