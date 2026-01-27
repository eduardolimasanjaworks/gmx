
import { createDirectus, rest, staticToken, readPolicies, createPermission } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE = 'disponivel';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function ensurePermissions() {
    try {
        console.log(`Checking permissions for ${TABLE}...`);
        const policies = await client.request(readPolicies());
        const publicPolicy = policies.find(p => p.name === 'Public Motorista Policy') || policies.find(p => p.name === 'Public');

        if (publicPolicy) {
            console.log(`Using Policy: ${publicPolicy.name}`);
            for (const action of ['read', 'create', 'update', 'delete']) {
                try {
                    await client.request(createPermission({
                        policy: publicPolicy.id,
                        collection: TABLE,
                        action: action,
                        fields: ['*']
                    }));
                    console.log(`  Granted ${action}`);
                } catch (e) {
                    // console.log(`  ${action} already exists or failed.`);
                }
            }
        } else {
            console.log("❌ Public Policy not found!");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

ensurePermissions();
