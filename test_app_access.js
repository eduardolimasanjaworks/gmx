import { createDirectus, rest, readItems } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directusToken = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn';

const client = createDirectus(directusUrl)
    .with(rest());

async function testAppAccess() {
    console.log(`Testing access to 'embarques' with token...`);

    // Set token manually for the request since we aren't using .with(authentication()) for this simple test
    // or we can just use static token

    try {
        const result = await client.request(
            readItems('embarques', {
                limit: 1,
                access_token: directusToken // Pass token explicitly here for simple REST test
            })
        );
        console.log('✅ Success! Can read embarques.');
        console.log('Sample item ID:', result[0]?.id);
    } catch (error) {
        console.error('❌ Failed to read embarques:', error.message);
        if (error.errors) console.error('Details:', JSON.stringify(error.errors, null, 2));
    }
}

testAppAccess();
