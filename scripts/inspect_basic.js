import { createDirectus, rest, staticToken, readCollections, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspect() {
    try {
        console.log("Reading collections...");
        const collections = await client.request(readCollections());
        const fotosColl = collections.find(c => c.collection === 'fotos');

        if (fotosColl) {
            console.log("✅ Collection 'fotos' exists.");
        } else {
            console.log("❌ Collection 'fotos' DOES NOT exist.");
        }

        console.log("Reading fields for 'fotos'...");
        try {
            const fields = await client.request(readFields('fotos'));
            const motoField = fields.find(f => f.field === 'motorista_id');
            if (motoField) {
                console.log("✅ Field 'motorista_id' exists in 'fotos'.");
                console.log("   Belongs to collection:", motoField.collection);
            } else {
                console.log("❌ Field 'motorista_id' DOES NOT exist in 'fotos'.");
                console.log("   Available fields:", fields.map(f => f.field).join(', '));
            }
        } catch (e) {
            console.log("❌ Failed to read fields for 'fotos':", e.message);
        }

    } catch (err) {
        console.error(err);
    }
}

inspect();
