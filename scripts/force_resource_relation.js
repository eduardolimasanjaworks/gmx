
import { createDirectus, rest, staticToken, createItem, readRelations } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function forceRelation() {
    try {
        console.log("Checking relations...");
        const relations = await client.request(readRelations());
        const existing = relations.find(r => r.collection === 'fotos' && r.field === 'motorista_id');

        if (existing) {
            console.log("Relation already exists! Details:", existing);
            return;
        }

        console.log("Creating relation record in directus_relations...");

        await client.request(createItem('directus_relations', {
            many_collection: 'fotos',
            many_field: 'motorista_id',
            one_collection: 'cadastro_motorista',
            one_deselect_action: 'nullify'
        }));

        console.log("✅ Relation created successfully!");


    } catch (e) {
        const fs = await import('fs');
        const errorLog = `Error: ${e.message}\n${JSON.stringify(e, null, 2)}\n${JSON.stringify(e.errors || {}, null, 2)}`;
        fs.writeFileSync('error_log.txt', errorLog);
        console.error("❌ Error written to error_log.txt");
    }
}


forceRelation();
