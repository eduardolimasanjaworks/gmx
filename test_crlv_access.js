import { createDirectus, rest, readItems } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directusToken = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn';

const client = createDirectus(directusUrl).with(rest());

async function testCrlvAccess() {
    console.log(`🔍 Testing access to 'crlv' collection...`);
    try {
        const result = await client.request(
            readItems('crlv', {
                limit: 1,
                access_token: directusToken
            })
        );
        console.log(`✅ Access to 'crlv' OK. Found ${result.length} items.`);
        if (result.length > 0) {
            console.log('Sample CRLV keys:', Object.keys(result[0]).join(', '));
        }
    } catch (error) {
        console.error(`❌ Failed to access 'crlv': ${error.message}`);
    }
}

testCrlvAccess();
