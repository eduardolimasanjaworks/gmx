
import { createDirectus, rest, staticToken, readRelations } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspectRelations() {
    try {
        const relations = await client.request(readRelations());
        const target = relations.find(r => r.collection === 'disponivel' && r.field === 'motorista_id');

        if (target) {
            console.log("Found Relation:");
            console.log("  ID:", target.id);
            console.log("  Many Collection:", target.collection);
            console.log("  Many Field:", target.field);
            console.log("  One Collection:", target.related_collection);
            console.log("  One Field (Alias):", target.meta?.one_field);
        } else {
            console.log("❌ Relation not found!");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

inspectRelations();
