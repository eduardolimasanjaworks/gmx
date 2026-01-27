
import { createDirectus, rest, staticToken, updateCollection } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function fixMeta() {
    try {
        console.log("Updating 'fotos' collection meta...");

        await client.request(updateCollection('fotos', {
            meta: {
                group: null,
                hidden: false,
                singleton: false,
                icon: 'photo_camera',
                note: 'Fotos dos veículos',
                display_template: '{{id}}',
                sort_field: 'date_created'
            }
        }));

        console.log("✅ Collection meta updated. It should be visible now.");

    } catch (e) {
        console.error("❌ Error:", e);
    }
}

fixMeta();
