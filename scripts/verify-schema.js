import { createDirectus, rest, staticToken, readCollections } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function verify() {
    try {
        const collections = await client.request(readCollections());
        const userCollections = collections.filter(c => !c.collection.startsWith('directus_'));

        console.log(`Found ${userCollections.length} User Collections:`);
        userCollections.forEach(c => console.log(` - ${c.collection}`));

    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verify();
