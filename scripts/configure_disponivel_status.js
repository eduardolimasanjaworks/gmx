
import { createDirectus, rest, staticToken, updateField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE = 'disponivel';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function updateStatusField() {
    try {
        console.log(`Configuring 'status' field in '${TABLE}'...`);

        await client.request(updateField(TABLE, 'status', {
            meta: {
                interface: 'select-dropdown',
                display: 'labels',
                options: {
                    choices: [
                        { text: 'Ativo', value: 'ativo', color: '#2ECDA7' },      // Green
                        { text: 'Finalizado', value: 'finalizado', color: '#6644FF' }, // Purple
                        { text: 'Cancelado', value: 'cancelado', color: '#E35169' } // Red
                    ]
                },
                display_options: {
                    show_as_dot: true,
                    choices: [
                        { text: 'Ativo', value: 'ativo', background: '#2ECDA7', color: '#FFFFFF' },
                        { text: 'Finalizado', value: 'finalizado', background: '#6644FF', color: '#FFFFFF' },
                        { text: 'Cancelado', value: 'cancelado', background: '#E35169', color: '#FFFFFF' }
                    ]
                }
            },
            schema: {
                default_value: 'ativo' // Default to Ativo when created
            }
        }));

        console.log("✅ Status field updated to Dropdown (Ativo/Finalizado).");

    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

updateStatusField();
