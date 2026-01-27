
import { createDirectus, rest, staticToken, createPermission } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function grantForce() {
    try {
        console.log("Attempting to grant CREATE on 'disponivel' to Public...");

        // Correcting payload structure for createPermission
        // API expects 'role' to be explicitly null for Public
        const result = await client.request(createPermission({
            role: null,
            collection: 'disponivel',
            action: 'create',
            permissions: {}, // Sometimes needed
            validation: {}, // Sometimes needed
            fields: ['*']
        }));

        console.log("✅ Permission granted!", result);

    } catch (e) {
        console.error("Error:", JSON.stringify(e));
        // If error is "Value is required" or validation, it implies malformed request object for the SDK version.
        // I will try a raw axios request if SDK fails.
    }
}

grantForce();
