import { createDirectus, rest, staticToken, readSettings } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function getPublicRole() {
    try {
        const settings = await client.request(readSettings());
        console.log('Public Role ID from Settings:', settings.public_role);

        if (settings.public_background) {
            console.log('Found Settings object.');
        }
    } catch (err) {
        console.error(err);
    }
}

getPublicRole();
