
import { createDirectus, rest, staticToken, createRelation, deleteField, createField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE = 'disponivel';
const RELATED_TABLE = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function fixDisponivelRelation() {
    try {
        console.log("🛠️ Fixing 'disponivel' relationship...");

        // 1. Delete existing simple integer field if it exists and is not a relation
        // Actually, createRelation needs the field to specific type usually, or let it create it.
        // But if it's already an integer, we might just need to add the relation metadata.
        // However, safest is to recreate the field to be sure.

        try {
            console.log("  Deleting old motorista_id field...");
            await client.request(deleteField(TABLE, 'motorista_id'));
        } catch (e) {
            console.log("  (Field might not exist)");
        }

        // 2. Create Field (Integer)
        console.log("  Creating motorista_id field...");
        await client.request(createField(TABLE, {
            field: 'motorista_id',
            type: 'integer',
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                display: 'related-values',
                display_name: 'Motorista',
                display_template: '{{motorista_id}}' // Temporary until we know what to show
            }
        }));

        // 3. Create Relation
        console.log("  Creating Relation...");
        await client.request(createRelation({
            collection: TABLE,
            field: 'motorista_id',
            related_collection: RELATED_TABLE,
            schema: {
                on_delete: 'SET NULL'
            },
            meta: {
                many_collection: TABLE,
                many_field: 'motorista_id',
                one_collection: RELATED_TABLE,
                one_deselect_action: 'nullify'
            }
        }));

        console.log("✅ Relationship fix applied to 'disponivel'.");

    } catch (e) {
        console.error("❌ Error:", e);
        if (e.errors) console.error(JSON.stringify(e.errors, null, 2));
    }
}

fixDisponivelRelation();
