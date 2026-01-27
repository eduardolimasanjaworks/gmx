import { createDirectus, rest, staticToken, deleteCollection } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'fotos';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function deleteFotosTable() {
    console.log(`Deleting collection: ${TABLE_NAME}...`);
    try {
        await client.request(deleteCollection(TABLE_NAME));
        console.log(`✅ Collection ${TABLE_NAME} deleted successfully.`);
    } catch (err) {
        console.error(`❌ Failed to delete collection ${TABLE_NAME}:`, err.message);
    }
}

deleteFotosTable();
