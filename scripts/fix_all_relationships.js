
import { createDirectus, rest, staticToken, deleteRelation, createRelation } from '@directus/sdk';

const DIRECTUS_URL = "https://gmx.sanjaworks.com/api";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const TASKS = [
    { table: 'cnh', alias: 'dados_cnh' },
    { table: 'antt', alias: 'dados_antt' },
    { table: 'crlv', alias: 'dados_crlv' },
    { table: 'comprovante_endereco', alias: 'dados_endereco' },
    { table: 'carreta_1', alias: 'carreta1' },
    { table: 'carreta_2', alias: 'carreta2' },
    { table: 'carreta_3', alias: 'carreta3' }
];

async function fixAll() {
    console.log("🛠️ STARTING BULK FIX...");

    for (const task of TASKS) {
        console.log(`\nProcessing ${task.table}...`);

        try {
            console.log(`   Deleting existing relation on ${task.table}.motorista_id...`);
            await client.request(deleteRelation(task.table, 'motorista_id'));
            console.log("   ✅ Deleted.");
        } catch (e) {
            console.log("   (Reference might not exist or already deleted)");
        }

        try {
            console.log(`   Creating correct relation: ${task.table}.motorista_id -> cadastro_motorista...`);
            await client.request(createRelation({
                collection: task.table,
                field: 'motorista_id',
                related_collection: 'cadastro_motorista',
                schema: {
                    on_delete: 'CASCADE'
                },
                meta: {
                    one_collection: 'cadastro_motorista',
                    one_field: task.alias, // This sets the alias on the parent table
                    sort_field: null,
                    one_deselect_action: 'delete'
                }
            }));
            console.log("   ✅ Relation created successfully.");
        } catch (e) {
            console.error(`   ❌ FAILED to create relation for ${task.table}:`, e.message);
            if (e.errors) console.error(JSON.stringify(e.errors, null, 2));
        }
    }

    console.log("\n🏁 BULK FIX COMPLETED.");
}

fixAll();
