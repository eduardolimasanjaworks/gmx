import { createDirectus, rest, staticToken, deleteField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const TABLE_NAME = 'cadastro_motorista';

async function removeStatusField() {
    console.log(`Removing status_logistica field from ${TABLE_NAME}...`);

    try {
        await client.request(deleteField(TABLE_NAME, 'status_logistica'));
        console.log(`✅ Field status_logistica deleted.`);
    } catch (err) {
        // Ignore if not found, but log error
        console.log(`ℹ️ Info (might be already deleted or not found):`, err.message);
    }
}

removeStatusField();
