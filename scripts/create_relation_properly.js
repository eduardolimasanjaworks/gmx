
import { createDirectus, rest, staticToken, createRelation } from '@directus/sdk';
import fs from 'fs';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function run() {
    try {
        console.log("Creating relation via createRelation...");

        await client.request(createRelation({
            collection: 'fotos',
            field: 'motorista_id',
            related_collection: 'cadastro_motorista',
            schema: {
                on_delete: 'SET NULL'
            },
            meta: {
                one_collection: 'cadastro_motorista',
                many_collection: 'fotos',
                many_field: 'motorista_id',
            }
        }));

        console.log("✅ createRelation success!");

    } catch (e) {
        const errorLog = `Error: ${e.message}\n${JSON.stringify(e, null, 2)}\n${JSON.stringify(e.errors || {}, null, 2)}`;
        fs.writeFileSync('error_log_v2.txt', errorLog);
        console.error("❌ Error written to error_log_v2.txt");
    }
}

run();
