
import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function readOne() {
    try {
        const items = await client.request(readItems('disponivel', { limit: 1 }));
        if (items.length > 0) {
            console.log("Record Keys:", Object.keys(items[0]));
            console.log("Record:", items[0]);
        } else {
            console.log("No items found.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

readOne();
