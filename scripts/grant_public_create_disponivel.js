
import { createDirectus, rest, staticToken, createPermission, readRoles } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function grant() {
    try {
        console.log("Granting 'create' permission on 'disponivel' to Public...");

        await client.request(createPermission({
            role: null, // Public
            collection: 'disponivel',
            action: 'create',
            fields: ['*'] // Allow all fields
        }));

        console.log("✅ Permission granted!");

        // Also ensure update permission if they need to edit it later? 
        // For now, CREATE is the blocker for the registration flow.

    } catch (e) {
        console.error("Error (maybe already exists):", e.errors?.[0]?.message || e.message);
    }
}

grant();
