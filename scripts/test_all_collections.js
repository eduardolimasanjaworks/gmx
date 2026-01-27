
import { createDirectus, rest, staticToken, readCollections } from '@directus/sdk';

const url = "http://91.99.137.101:8057";
const token = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

console.log(`Connecting to ${url}...`);

const client = createDirectus(url)
    .with(staticToken(token))
    .with(rest());

async function test() {
    try {
        console.log("Attempting to fetch collections list...");
        const collections = await client.request(readCollections());
        console.log("---------------------------------------------------");
        console.log("✅ Successfully fetched collections!");
        console.log(`Found ${collections.length} collections.`);
        console.log("---------------------------------------------------");

        // List non-system collections mostly, or all
        const userCollections = collections.filter(c => !c.collection.startsWith('directus_'));
        const systemCollections = collections.filter(c => c.collection.startsWith('directus_'));

        console.log(`System Collections: ${systemCollections.length}`);
        console.log(`User Collections: ${userCollections.length}`);

        if (userCollections.length > 0) {
            console.log("\nUser Collections:");
            userCollections.forEach(c => {
                console.log(` - ${c.collection}`);
            });
        }
    } catch (error) {
        console.error("❌ Error fetching collections:", error);
        // Print more details if available
        if (error.errors) {
            console.error("Details:", JSON.stringify(error.errors, null, 2));
        }
    }
}

test();
