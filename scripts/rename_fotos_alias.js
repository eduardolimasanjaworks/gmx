
import { createDirectus, rest, staticToken, updateRelation, readRelations } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function renameFotosAlias() {
    console.log("Renaming alias 'dados_fotos' to 'fotos'...");

    try {
        const relations = await client.request(readRelations());
        const fotosRel = relations.find(r =>
            r.collection === 'fotos' &&
            r.field === 'motorista_id' &&
            r.related_collection === 'cadastro_motorista'
        );

        if (!fotosRel) {
            console.error("❌ Relation not found!");
            return;
        }

        console.log(`Found relation ID: ${fotosRel.id}`);

        await client.request(updateRelation(fotosRel.collection, fotosRel.field, {
            meta: {
                one_field: 'fotos', // Changing to 'fotos'
                one_collection: 'fotos',
                one_deselect_action: 'delete'
            }
        }));

        console.log("✅ Alias renamed to 'fotos' successfully!");

    } catch (err) {
        console.error("❌ Error:", err);
    }
}

renameFotosAlias();
