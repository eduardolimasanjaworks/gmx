
import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn';

const client = createDirectus(DIRECTUS_URL)
    .with(rest())
    .with(staticToken(DIRECTUS_TOKEN));

async function checkSchema() {
    try {
        console.log('Checking disponivel items for location data...');
        const items = await client.request(readItems('disponivel', {
            limit: 5,
            fields: ['id', 'motorista_id', 'localizacao_atual', 'latitude', 'longitude']
        }));

        console.log('Items found:', items);
    } catch (error) {
        console.error('Error fetching items:', error);
    }
}

checkSchema();
