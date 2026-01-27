
import { createDirectus, rest, staticToken, readCollections } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function checkCollections() {
    const cols = await client.request(readCollections());
    const names = cols.map(c => c.collection).filter(n => !n.startsWith('directus_'));
    console.log("Collections:", names);
}

checkCollections();
