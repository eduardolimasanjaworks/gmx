
import { createDirectus, rest, staticToken, deleteField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE = 'fotos';
const FIELD = 'status';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function removeStatus() {
    try {
        console.log(`🗑️ Removing field '${FIELD}' from '${TABLE}'...`);
        await client.request(deleteField(TABLE, FIELD));
        console.log("✅ Field removed successfully.");
    } catch (e) {
        console.error("❌ Error removing field:", e.message);
    }
}

removeStatus();
