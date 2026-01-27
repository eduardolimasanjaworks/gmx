
import { createDirectus, rest, staticToken, updateItems, readItems } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE = 'disponivel';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function migrateStatus() {
    try {
        console.log(`Checking for records with empty status in '${TABLE}'...`);

        const items = await client.request(readItems(TABLE, {
            filter: {
                _or: [
                    { status: { _null: true } },
                    { status: { _empty: true } }
                ]
            },
            fields: ['id']
        }));

        if (items.length > 0) {
            console.log(`Found ${items.length} records. Updating to 'ativo'...`);
            const ids = items.map(i => i.id);
            await client.request(updateItems(TABLE, ids, {
                status: 'ativo'
            }));
            console.log("✅ Records updated.");
        } else {
            console.log("✅ No empty status records found.");
        }

    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

migrateStatus();
