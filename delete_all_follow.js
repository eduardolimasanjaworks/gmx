import { createDirectus, rest, staticToken, readItems, deleteItems } from '@directus/sdk';

const directus = createDirectus('http://91.99.137.101:8057')
    .with(staticToken('WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq'))
    .with(rest());

async function deleteAllFollow() {
    try {
        console.log("Fetching follow items to delete...");

        // Let's fetch a chunk first
        let items = await directus.request(readItems('follow', {
            fields: ['id'],
            limit: 100
        }));

        let totalDeleted = 0;

        while (items.length > 0) {
            const ids = items.map(i => i.id);
            console.log(`Deleting batch of ${ids.length} items...`);
            await directus.request(deleteItems('follow', ids));
            totalDeleted += ids.length;

            items = await directus.request(readItems('follow', {
                fields: ['id'],
                limit: 100
            }));
        }

        console.log(`Successfully deleted ${totalDeleted} follow items.`);
    } catch (error) {
        console.error("Error deleting follow items:", error);
    }
}

deleteAllFollow();
