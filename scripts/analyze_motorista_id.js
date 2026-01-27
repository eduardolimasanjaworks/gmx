import { createDirectus, rest, staticToken, readFields, readRelations } from '@directus/sdk';
import fs from 'fs';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function analyzeMotoristaId() {
    let output = "";
    try {
        output += "Analyzing 'cnh' table...\n";

        // 1. Get Field Info
        const cnhFields = await client.request(readFields('cnh'));
        const motoIdField = cnhFields.find(f => f.field === 'motorista_id');

        if (motoIdField) {
            output += "--- Field Definition (CNH) ---\n";
            output += JSON.stringify(motoIdField, null, 2) + "\n";
        } else {
            output += "Field 'motorista_id' not found in CNH.\n";
        }

        // 2. Get Relation Info
        const relations = await client.request(readRelations());
        const cnhRelation = relations.find(r => r.collection === 'cnh' && r.field === 'motorista_id');

        if (cnhRelation) {
            output += "\n--- Relation Definition (CNH) ---\n";
            output += JSON.stringify(cnhRelation, null, 2) + "\n";
        } else {
            output += "No relation found for 'cnh.motorista_id'.\n";
        }

        fs.writeFileSync('analysis_output.txt', output);
        console.log("Analysis written to analysis_output.txt");

    } catch (err) {
        console.error("Error:", err);
    }
}

analyzeMotoristaId();
