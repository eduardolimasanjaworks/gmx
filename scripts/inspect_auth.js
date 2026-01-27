import { createDirectus, rest, staticToken, readRoles, readPolicies } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspectAuth() {
    try {
        console.log("--- ROLES ---");
        const roles = await client.request(readRoles());
        roles.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Description: ${r.description}`));

        console.log("\n--- POLICIES ---");
        const policies = await client.request(readPolicies());
        policies.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name}`));

    } catch (err) {
        console.error(err);
    }
}

inspectAuth();
