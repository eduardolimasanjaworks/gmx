
import fs from 'fs';
import path from 'path';

// Manual env loader
const envPath = path.resolve(process.cwd(), '.env');
let env = {};
try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    });
} catch (e) {
    console.log("No .env found or error reading it.");
}

const CLIENT_URL = env.VITE_DIRECTUS_URL || "http://91.99.137.101:8057";
const CLIENT_TOKEN = env.VITE_DIRECTUS_TOKEN || "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const PARENT = 'cadastro_motorista';
const RELATIONS = [
    { table: 'cnh', alias: 'dados_cnh' },
    { table: 'antt', alias: 'dados_antt' },
    { table: 'crlv', alias: 'dados_crlv' },
    { table: 'comprovante_endereco', alias: 'dados_endereco' },
    { table: 'carreta_1', alias: 'carreta1' },
    { table: 'carreta_2', alias: 'carreta2' },
    { table: 'carreta_3', alias: 'carreta3' },
    { table: 'fotos', alias: 'dados_fotos' },
];

async function setupAliases() {
    console.log(`Configuring O2M Aliases on ${PARENT}...`);
    console.log(`URL: ${CLIENT_URL}`);

    try {
        const relsResponse = await fetch(`${CLIENT_URL}/relations`, {
            headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
        });
        const json = await relsResponse.json();
        const relations = json.data;

        if (!relations) {
            console.error("Failed to fetch relations:", json);
            return;
        }

        for (const rel of RELATIONS) {
            const relationDef = relations.find(r =>
                r.collection === rel.table &&
                r.field === 'motorista_id' &&
                r.related_collection === PARENT
            );

            if (relationDef) {
                console.log(`Found relation for ${rel.table}. Updating alias to '${rel.alias}'...`);

                const updateRes = await fetch(`${CLIENT_URL}/relations/${relationDef.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${CLIENT_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        meta: {
                            one_field: rel.alias,
                            one_collection: rel.table,
                            one_deselect_action: 'delete'
                        }
                    })
                });

                if (updateRes.ok) {
                    console.log(`✅ Alias '${rel.alias}' configured successfully.`);
                } else {
                    console.error(`❌ Failed to update ${rel.table}:`, await updateRes.text());
                }
            } else {
                console.warn(`⚠️ Relation not found for ${rel.table}. Check add_relationships.js.`);
            }
        }

    } catch (error) {
        console.error("Error setting up aliases:", error);
    }
}

setupAliases();
