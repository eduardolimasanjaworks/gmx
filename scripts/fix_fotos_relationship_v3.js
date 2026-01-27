
import { createDirectus, rest, staticToken, deleteRelation, createRelation, updateField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function fix() {
    try {
        console.log("🛠 Fix 'fotos' Relationship...");

        // 1. Delete existing wrong relationship if it exists
        try {
            console.log("Deleting existing relation on fotos.motorista_id...");
            await client.request(deleteRelation('fotos', 'motorista_id'));
            console.log("✅ Deleted.");
        } catch (e) {
            console.log("Reference might not exist or already deleted:", e.message);
        }

        // 2. Create correct relationship
        console.log("Creating correct relation: fotos.motorista_id -> cadastro_motorista.id");
        await client.request(createRelation({
            collection: 'fotos',
            field: 'motorista_id',
            related_collection: 'cadastro_motorista',
            schema: {
                on_delete: 'CASCADE'
            },
            meta: {
                one_collection: 'cadastro_motorista',
                one_field: 'fotos', // This creates the 'fotos' alias on cadastro_motorista
                sort_field: null,
                one_deselect_action: 'delete'
            }
        }));
        console.log("✅ Relation created.");

        // 3. Update the field alias on cadastro_motorista just to be sure it has the right interface
        // (The relation creation above usually handles it, but setting interface explicitly helps)
        /*  try {
             await client.request(updateField('cadastro_motorista', 'fotos', {
                 meta: {
                     interface: 'list-o2m',
                     special: ['o2m']
                 }
             }));
              console.log("✅ Alias interface updated.");
         } catch (e) {
             console.log("Could not update alias interface (might be handled by specific endpoint):", e.message);
         } */


    } catch (e) {
        console.error("❌ GLOBAL ERROR:", e);
        if (e.errors) console.error("API Errors:", JSON.stringify(e.errors, null, 2));
    }
}

fix();
