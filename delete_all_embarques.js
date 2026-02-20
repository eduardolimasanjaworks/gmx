import { createDirectus, rest, staticToken, readItems, deleteItems } from '@directus/sdk';

const directus = createDirectus('http://91.99.137.101:8057')
    .with(staticToken('WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq'))
    .with(rest());

async function deleteAll() {
    try {
        console.log("Fetching embarques to delete...");
        // Get all IDs
        const items = await directus.request(readItems('embarques', {
            fields: ['id'],
            limit: -1
        }));

        if (items.length === 0) {
            console.log("No embarques found to delete.");
            return;
        }

        const ids = items.map(i => i.id);
        console.log(`Found ${ids.length} embarques. Deleting...`);

        // Delete in batches of 100 to avoid request limits
        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            await directus.request(deleteItems('embarques', batch));
            console.log(`Deleted batch ${i / batchSize + 1} (${batch.length} items)`);
        }

        console.log("Successfully deleted all embarques.");
    } catch (error) {
        console.error("Error deleting embarques:", error);
    }
}

deleteAll();
