import { createDirectus, rest, staticToken, readFields, readRelations } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function debugFotosRel() {
    try {
        console.log("Checking relations for 'fotos'...");
        const relations = await client.request(readRelations());
        const fotosRel = relations.find(r => r.collection === 'fotos' && r.field === 'motorista_id');

        if (fotosRel) {
            console.log("✅ Relation found:");
            console.log(JSON.stringify(fotosRel, null, 2));
        } else {
            console.log("❌ No relation found for fotos.motorista_id");
            // Check if maybe keys are swapped or something weird
            const anyFotosRel = relations.filter(r => r.collection === 'fotos' || r.related_collection === 'fotos');
            console.log("Any relations involving fotos:", JSON.stringify(anyFotosRel, null, 2));
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

debugFotosRel();
