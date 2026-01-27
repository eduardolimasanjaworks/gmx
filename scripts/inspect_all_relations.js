
import { createDirectus, rest, staticToken, readRelations } from '@directus/sdk';
import fs from 'fs';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const TABLES_TO_CHECK = [
    'carretas',
    'carreta',
    'cnh',
    'antt',
    'crlv',
    'comprovante_endereco',
    'fotos'
];

async function inspectAll() {
    try {
        console.log("🔍 Inspecting Relationships...");
        const relations = await client.request(readRelations());

        const output = {};

        for (const table of TABLES_TO_CHECK) {
            // Find relations where this table is the "many" side (child)
            const rels = relations.filter(r => r.collection === table && r.field === 'motorista_id');

            if (rels.length === 0) {
                // Try singular if plural failed, just in case
                const relsSingular = relations.filter(r => r.collection === table.slice(0, -1) && r.field === 'motorista_id');
                if (relsSingular.length > 0) {
                    output[table.slice(0, -1)] = relsSingular.map(r => ({
                        field: r.field,
                        related_collection: r.related_collection,
                        one_field: r.meta?.one_field
                    }));
                } else {
                    output[table] = "❌ NO 'motorista_id' RELATION FOUND";
                }
            } else {
                output[table] = rels.map(r => ({
                    field: r.field,
                    related_collection: r.related_collection,
                    one_field: r.meta?.one_field
                }));
            }
        }

        fs.writeFileSync('relations_audit.json', JSON.stringify(output, null, 2));
        console.log("Written to relations_audit.json");

    } catch (e) {
        console.error("Error:", e);
    }
}

inspectAll();
