import { createDirectus, rest, readItems } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directusToken = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn';

const client = createDirectus(directusUrl).with(rest());

async function testQuery() {
    console.log(`Testing query with 'disponivel: true'...`);
    try {
        const result = await client.request(
            readItems('disponivel', {
                filter: {
                    disponivel: { _eq: true }
                },
                limit: 5,
                access_token: directusToken,
                fields: ['id', 'status', 'disponivel', 'motorista_id']
            })
        );

        console.log(`✅ Found ${result.length} items using disponivel=true`);
        if (result.length > 0) {
            console.log(JSON.stringify(result[0], null, 2));
        }

        console.log(`\nTesting query with 'status: disponivel'...`);
        const resultStatus = await client.request(
            readItems('disponivel', {
                filter: {
                    status: { _eq: 'disponivel' }
                },
                limit: 5,
                access_token: directusToken
            })
        );
        console.log(`⚠️ Found ${resultStatus.length} items using status=disponivel`);

    } catch (error) {
        console.error('❌ Query failed:', error.message);
    }
}

testQuery();
