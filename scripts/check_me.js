
import { createDirectus, rest, staticToken, readMe } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function check() {
    try {
        const me = await client.request(readMe({ fields: ['id', 'email', 'role.name', 'role.admin_access'] }));
        console.log("ME:", JSON.stringify(me, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

check();
