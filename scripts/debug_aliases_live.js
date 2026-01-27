
import { createDirectus, rest, staticToken, readRelations } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const PARENT = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function debugAliases() {
    console.log(`Checking aliases for parent: ${PARENT}...`);
    try {
        const relations = await client.request(readRelations());

        // Filter for relations where 'cadastro_motorista' is the 'related_collection' (Parent in O2M)
        const activeRelations = relations.filter(r => r.related_collection === PARENT);

        if (activeRelations.length === 0) {
            console.log("❌ No relations found where cadastro_motorista is the parent!");
        } else {
            console.log("\nFound Relations (O2M candidates):");
            activeRelations.forEach(r => {
                console.log(`--------------------------------------------------`);
                console.log(`Table (Many): ${r.collection}`);
                console.log(`FK Field:     ${r.field}`);
                console.log(`Alias (One Field): ${r.meta?.one_field || '❌ NOT SET'}`);
                console.log(`ID: ${r.id}`);
            });
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

debugAliases();
