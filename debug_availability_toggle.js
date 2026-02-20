
import { createDirectus, rest, staticToken, createItem, readItems } from '@directus/sdk';

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn'; // Hardcoded for debug

// Setup Directus client
const client = createDirectus(DIRECTUS_URL)
    .with(rest())
    .with(staticToken(DIRECTUS_TOKEN));

async function debugToggle() {
    try {
        console.log('1. Fetching a driver to test...');
        const drivers = await client.request(readItems('cadastro_motorista', {
            limit: 1,
            // fields: ['id', 'nome', 'telefone'] // Let's fetch everything to see what we have
            fields: ['*']
        }));

        if (drivers.length === 0) {
            console.error('No drivers found to test.');
            return;
        }

        const driver = drivers[0];
        console.log('Driver found:', { id: driver.id, name: driver.nome, telefone: driver.telefone });

        const payload = {
            motorista_id: driver.id,
            telefone: driver.telefone, // Testing if this is the issue
            status: 'published',
            disponivel: true,
            data_previsao_disponibilidade: new Date().toISOString(),
            // local_disponibilidade: 'Test Location', // Let's try minimal payload first like the app might sends
            // localizacao_atual: 'Test Location'
        };

        console.log('2. Attempting to create disponivel record with payload:', payload);

        const result = await client.request(createItem('disponivel', payload));
        console.log('✅ Success! Record created:', result);

    } catch (error) {
        console.error('❌ Error creating record:', error.message);
        if (error.errors) {
            console.error('Validation Errors:', JSON.stringify(error.errors, null, 2));
        } else {
            console.error('Full Error:', error);
        }
    }
}

debugToggle();
