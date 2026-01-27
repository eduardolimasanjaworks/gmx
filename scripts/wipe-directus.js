import { createDirectus, rest, staticToken, readCollections, deleteCollection } from '@directus/sdk';


// Manually load env if dotenv is not working as expected in this context, 
// though 'dotenv/config' usually handles it for standard node scripts.
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
    console.error('Error: DIRECTUS_URL or DIRECTUS_TOKEN not found.');
    process.exit(1);
}

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function wipeDirectus() {
    console.log(`Connecting to ${DIRECTUS_URL}...`);

    try {
        // 1. List all collections
        const collections = await client.request(readCollections());

        // Filter for user collections (exclude directus_ system collections)
        const userCollections = collections.filter(col => !col.collection.startsWith('directus_'));

        if (userCollections.length === 0) {
            console.log('No user collections found to delete.');
            return;
        }

        console.log(`Found ${userCollections.length} collections to delete:`);
        console.log(userCollections.map(c => c.collection).join(', '));

        // 2. Delete each collection
        for (const col of userCollections) {
            console.log(`Deleting collection: ${col.collection}...`);
            try {
                await client.request(deleteCollection(col.collection));
                console.log(`✅ Deleted ${col.collection}`);
            } catch (err) {
                console.error(`❌ Failed to delete ${col.collection}:`, err.message);
            }
        }

        console.log('✨ Wipe complete!');

    } catch (error) {
        console.error('Fatal Error during wipe:', error);
    }
}

wipeDirectus();
