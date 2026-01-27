import { createDirectus, rest, staticToken, readFields, readRelations } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspectModel() {
    try {
        console.log("--- Fields in 'fotos' ---");
        const fields = await client.request(readFields('fotos'));
        const motoristaId = fields.find(f => f.field === 'motorista_id');
        console.log(JSON.stringify(motoristaId, null, 2));

        console.log("\n--- Relations for 'fotos' ---");
        const relations = await client.request(readRelations());
        const fotosRelations = relations.filter(r => r.collection === 'fotos' || r.related_collection === 'fotos');
        console.log(JSON.stringify(fotosRelations, null, 2));

    } catch (err) {
        console.error("Error:", err);
    }
}

inspectModel();
