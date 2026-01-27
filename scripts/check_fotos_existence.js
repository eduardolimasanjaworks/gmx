
import { createDirectus, rest, staticToken, readCollections } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function checkCollections() {
    try {
        console.log("Listing collections...");
        const collections = await client.request(readCollections());
        const fotos = collections.find(c => c.collection === 'fotos');

        if (fotos) {
            console.log("✅ Table 'fotos' EXISTS found in API response.");
            console.log(JSON.stringify(fotos, null, 2));
        } else {
            console.log("❌ Table 'fotos' NOT FOUND in API response.");
            console.log("Available tables:", collections.map(c => c.collection).join(', '));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

checkCollections();
