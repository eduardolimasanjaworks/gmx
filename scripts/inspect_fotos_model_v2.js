

import { createDirectus, rest, staticToken, readFields, readRelations } from '@directus/sdk';
import fs from 'fs';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspect() {
    try {
        let output = "";
        output += "--- Fields in 'fotos' ---\n";
        const fields = await client.request(readFields('fotos'));
        fields.forEach(f => {
            output += `Field: ${f.field}, Type: ${f.type}, Interface: ${f.meta?.interface}, Special: ${f.meta?.special}\n`;
        });

        output += "\n--- Relations involving 'fotos' ---\n";
        const relations = await client.request(readRelations());
        const fotosRels = relations.filter(r => r.collection === 'fotos' || r.related_collection === 'fotos');
        output += JSON.stringify(fotosRels, null, 2) + "\n";

        output += "\n--- 'cadastro_motorista' ID Field ---\n";
        const driverFields = await client.request(readFields('cadastro_motorista'));
        const idField = driverFields.find(f => f.field === 'id');
        output += `ID Field Type: ${idField?.type}, Schema Type: ${idField?.schema?.data_type}\n`;

        fs.writeFileSync('analysis_output_v2.txt', output);
        console.log("Written to analysis_output_v2.txt");

    } catch (e) {
        console.error("Error:", e);
    }
}

inspect();

