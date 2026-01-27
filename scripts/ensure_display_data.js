
import { createDirectus, rest, staticToken, readItems, updateItem, createItem } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function ensureData() {
    try {
        console.log("Checking for 'disponivel' drivers...");
        const items = await client.request(readItems('disponivel', {
            filter: { status: { _eq: 'disponivel' } },
            limit: 1
        }));

        if (items.length > 0) {
            console.log("✅ Data exists. Frontend should show at least 1 driver.");
        } else {
            console.log("⚠️ No 'disponivel' drivers found.");
            console.log("   Attempting to update an existing record...");

            const anyItem = await client.request(readItems('disponivel', { limit: 1 }));

            if (anyItem.length > 0) {
                await client.request(updateItem('disponivel', anyItem[0].id, { status: 'disponivel' }));
                console.log(`   ✅ Updated record ${anyItem[0].id} to 'disponivel'.`);
            } else {
                console.log("   ❌ No records in 'disponivel' to update. You might need to create one manually first via the App or API.");
            }
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

ensureData();
