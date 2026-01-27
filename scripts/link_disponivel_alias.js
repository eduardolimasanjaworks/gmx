
import { createDirectus, rest, staticToken, readRelations, updateRelation } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function linkAlias() {
    try {
        console.log("Reading relations for 'disponivel'...");
        const relations = await client.request(readRelations());

        // Find relation: Many=disponivel, Field=motorista_id
        const rel = relations.find(r => r.collection === 'disponivel' && r.field === 'motorista_id');

        if (rel) {
            console.log("Found relation ID:", rel.id);
            console.log("Current one_field:", rel.meta?.one_field);

            console.log("Updating one_field to 'dados_disponibilidade'...");

            await client.request(updateRelation('disponivel', 'motorista_id', {
                meta: {
                    one_field: 'dados_disponibilidade', // The alias we just created
                    one_collection: 'cadastro_motorista',
                    one_allowed_collections: ['cadastro_motorista']
                }
            }));
            console.log("✅ Relationship linked successfully!");
        } else {
            console.error("❌ Relation not found! check if field motorista_id exists in disponivel.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

linkAlias();
