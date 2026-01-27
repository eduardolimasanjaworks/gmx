import { createDirectus, rest, staticToken, createItem } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function fixRelation() {
    console.log("Attempting to create relation for fotos.motorista_id...");
    try {
        const result = await client.request(createItem('directus_relations', {
            many_collection: 'fotos',
            many_field: 'motorista_id',
            one_collection: 'cadastro_motorista',
            one_field: null, // Optional on the 'one' side
            one_allowed_collections: null,
            one_collection_field: null,
            junction_field: null,
            sort_field: null,
            one_deselect_action: 'nullify'
        }));
        console.log("✅ SUCCESS: Relation created!", result);
    } catch (err) {
        console.error("❌ ERROR creating relation:", JSON.stringify(err, null, 2));
        if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
    }
}

fixRelation();
