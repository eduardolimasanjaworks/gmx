
import { createDirectus, rest, staticToken, updateField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function update() {
    try {
        console.log("Updating 'status' field in 'disponivel'...");

        await client.request(updateField('disponivel', 'status', {
            meta: {
                interface: 'select-dropdown',
                options: {
                    choices: [
                        { text: 'Disponível', value: 'disponivel' },
                        { text: 'Indisponível', value: 'indisponivel' }
                    ]
                }
            }
        }));

        console.log("✅ Field updated successfully.");

    } catch (e) {
        console.error("Error:", e);
    }
}

update();
