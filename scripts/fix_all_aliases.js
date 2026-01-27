
import { createDirectus, rest, staticToken, readRelations, updateRelation } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const PARENT = 'cadastro_motorista';

const DEFINITIONS = [
    { table: 'cnh', alias: 'dados_cnh' },
    { table: 'antt', alias: 'dados_antt' },
    { table: 'crlv', alias: 'dados_crlv' },
    { table: 'comprovante_endereco', alias: 'dados_endereco' },
    { table: 'carreta_1', alias: 'carreta1' },
    { table: 'carreta_2', alias: 'carreta2' },
    { table: 'carreta_3', alias: 'carreta3' },
    { table: 'fotos', alias: 'fotos' }
];

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function fixAllAliases() {
    console.log("🔧 Fixing All Aliases...");

    try {
        const relations = await client.request(readRelations());

        for (const def of DEFINITIONS) {
            // Find the relation where definitions table is the "Many" side and Driver is the "One" side
            // Note: In Directus O2M, the relation is defined on the MANY side (Foreign Key).
            // So collection = def.table, field = motorista_id
            const rel = relations.find(r =>
                r.collection === def.table &&
                r.field === 'motorista_id'
            );

            if (!rel) {
                console.error(`❌ Relation NOT FOUND for table: ${def.table} (field: motorista_id)`);
                continue;
            }

            console.log(`Processing ${def.table}...`);
            try {
                // Update the relation using the collection and field as composite key
                await client.request(updateRelation(def.table, 'motorista_id', {
                    meta: {
                        one_field: def.alias,
                        one_collection: def.table, // This helps UI know what table it is
                        one_deselect_action: 'delete' // Cascade delete
                    }
                }));
                console.log(`  ✅ Alias set to '${def.alias}'`);
            } catch (err) {
                console.error(`  ❌ Failed to update alias: ${err.message}`);
            }
        }

    } catch (err) {
        console.error("Global Error:", err);
    }
}

fixAllAliases();
