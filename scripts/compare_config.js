import { createDirectus, rest, staticToken, readFields, readRelations, readCollections } from '@directus/sdk';
import fs from 'fs';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function compareTables() {
    let output = "";
    try {
        output += "--- COMPARING CNH vs FOTOS ---\n";

        // 1. Fields
        const cnhFields = await client.request(readFields('cnh'));
        const fotosFields = await client.request(readFields('fotos'));

        const cnhMoto = cnhFields.find(f => f.field === 'motorista_id');
        const fotosMoto = fotosFields.find(f => f.field === 'motorista_id');

        output += "\n[CNH] motorista_id meta:\n";
        output += JSON.stringify(cnhMoto?.meta, null, 2) + "\n";
        output += "\n[FOTOS] motorista_id meta:\n";
        output += JSON.stringify(fotosMoto?.meta, null, 2) + "\n";

        output += "\n[CNH] motorista_id schema:\n";
        output += JSON.stringify(cnhMoto?.schema, null, 2) + "\n";
        output += "\n[FOTOS] motorista_id schema:\n";
        output += JSON.stringify(fotosMoto?.schema, null, 2) + "\n";


        // 2. Relations
        const relations = await client.request(readRelations());
        const cnhRel = relations.find(r => r.collection === 'cnh' && r.field === 'motorista_id');
        const fotosRel = relations.find(r => r.collection === 'fotos' && r.field === 'motorista_id');

        output += "\n[CNH] Relation:\n";
        output += JSON.stringify(cnhRel, null, 2) + "\n";
        output += "\n[FOTOS] Relation:\n";
        output += JSON.stringify(fotosRel, null, 2) + "\n";

        fs.writeFileSync('compare_output.txt', output);
        console.log("Comparison saved to compare_output.txt");

    } catch (err) {
        console.error("Error:", err);
    }
}

compareTables();
