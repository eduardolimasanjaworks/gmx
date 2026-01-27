
import { createDirectus, rest, staticToken, readRelations, createRelation, updateRelation } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function ensureFotosRelation() {
    console.log("Ensuring 'fotos' relation (O2M alias)...");

    try {
        const relations = await client.request(readRelations());
        const existingRel = relations.find(r =>
            r.collection === 'fotos' &&
            r.field === 'motorista_id'
        );

        if (existingRel) {
            console.log(`Relation exists (ID: ${existingRel.id}). Updating alias...`);
            await client.request(updateRelation('fotos', 'motorista_id', {
                meta: {
                    one_field: 'fotos', // The alias user wants
                    one_collection: 'fotos',
                    one_deselect_action: 'delete'
                }
            }));
            console.log("✅ Relation updated: alias 'fotos' set.");
        } else {
            console.log("Relation missing. Creating...");
            await client.request(createRelation({
                collection: 'fotos',
                field: 'motorista_id',
                related_collection: 'cadastro_motorista',
                meta: {
                    one_field: 'fotos', // The alias
                    one_collection: 'fotos',
                    one_deselect_action: 'delete',
                    many_collection: 'fotos',
                    many_field: 'motorista_id'
                },
                schema: {
                    foreign_key_column: 'motorista_id',
                    on_delete: 'SET NULL'
                }
            }));
            console.log("✅ Relation created: alias 'fotos' set.");
        }

    } catch (err) {
        console.error("❌ Error:", err);
        if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
    }
}

ensureFotosRelation();
