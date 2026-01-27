import { createDirectus, rest, staticToken, readFields, readRelations } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspectProperly() {
    try {
        console.log("Reading ALL fields and finding 'fotos'...");
        const fields = await client.request(readFields());
        const motoField = fields.find(f => f.collection === 'fotos' && f.field === 'motorista_id');

        if (motoField) {
            console.log("✅ [Field] fotos.motorista_id found:");
            console.log(JSON.stringify(motoField, null, 2));
        } else {
            console.log("❌ [Field] fotos.motorista_id NOT FOUND.");
        }

        console.log("\nReading ALL relations and finding 'fotos'...");
        const relations = await client.request(readRelations());
        const fotosRel = relations.find(r => r.many_collection === 'fotos' && r.many_field === 'motorista_id');

        if (fotosRel) {
            console.log("✅ [Relation] Found:");
            console.log(JSON.stringify(fotosRel, null, 2));
        } else {
            console.log("❌ [Relation] NOT FOUND.");
            // Filter any relation involving fotos
            const anyRel = relations.filter(r => r.many_collection === 'fotos' || r.one_collection === 'fotos');
            console.log("   Any relations for 'fotos':", JSON.stringify(anyRel, null, 2));
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

inspectProperly();
