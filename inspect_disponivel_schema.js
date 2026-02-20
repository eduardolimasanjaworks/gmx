import { createDirectus, rest, readItems } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directusToken = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn'; // Updated token

const client = createDirectus(directusUrl).with(rest());

async function inspectSchema() {
    console.log(`Inspecting 'disponivel' collection...`);
    try {
        const result = await client.request(
            readItems('disponivel', {
                limit: 1,
                access_token: directusToken,
                fields: ['*'] // Fetch all top-level fields
            })
        );

        if (result.length > 0) {
            console.log('✅ First item found:');
            console.log(JSON.stringify(result[0], null, 2));
            console.log('\nKeys:', Object.keys(result[0]).join(', '));
        } else {
            console.log('⚠️ Collection is empty or no permission to read items.');
        }
    } catch (error) {
        console.error('❌ Failed to read collection:', error.message);
    }
}

inspectSchema();
