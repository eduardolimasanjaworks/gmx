
import { createDirectus, rest, staticToken, readPermissions } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function checkPerms() {
    try {
        console.log("Checking permissions for 'disponivel'...");
        // Fetch all permissions for 'disponivel' collection
        const perms = await client.request(readPermissions({
            filter: { collection: { _eq: 'disponivel' } }
        }));

        console.log("Permissions Found:", perms.length);
        perms.forEach(p => {
            console.log(`- Role: ${p.role || 'Public'} | Action: ${p.action} | Fields: ${p.fields}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

checkPerms();
