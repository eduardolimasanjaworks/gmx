import { createDirectus, rest, staticToken, readCollections, updateField } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function makeDateCreatedVisible() {
    console.log("Making 'date_created' visible on all user tables...");

    try {
        const collections = await client.request(readCollections());
        const userCollections = collections
            .filter(c => !c.collection.startsWith('directus_'))
            .map(c => c.collection);

        console.log(`Found ${userCollections.length} tables: ${userCollections.join(', ')}`);

        for (const table of userCollections) {
            console.log(`\nProcessing table: ${table}`);

            try {
                await client.request(updateField(table, 'date_created', {
                    meta: {
                        hidden: false,           // SHOW it in the UI
                        readonly: true,          // BUT keep it read-only
                        interface: 'datetime',
                        display: 'datetime',
                        width: 'half'
                    }
                }));
                console.log(`  ✅ 'date_created' is now VISIBLE.`);
            } catch (err) {
                console.error(`  ❌ Failed to update field on ${table}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error("Global Error:", err);
    }
}

makeDateCreatedVisible();
