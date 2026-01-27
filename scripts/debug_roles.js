import { createDirectus, rest, staticToken, readRoles } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function debugRoles() {
    const roles = await client.request(readRoles());
    console.log(JSON.stringify(roles, null, 2));
}

debugRoles();
