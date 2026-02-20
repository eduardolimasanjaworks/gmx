import { createDirectus, rest, readItems } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directusToken = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn';

const client = createDirectus(directusUrl).with(rest());

async function debugRelation() {
    console.log(`🔍 Testing 'motorista_id' expansion...`);
    try {
        const result = await client.request(
            readItems('disponivel', {
                filter: {
                    disponivel: { _eq: true }
                },
                limit: 1,
                access_token: directusToken,
                fields: ['id', 'motorista_id.*'] // Try to expand
            })
        );

        console.log('Result for disponivel:');
        console.log(JSON.stringify(result[0], null, 2));

        // Check if motorista_id is an object or just ID
        if (result[0]?.motorista_id && typeof result[0].motorista_id === 'object') {
            console.log('✅ Relation expanded successfully.');
        } else {
            console.log('❌ Relation NOT expanded. It is:', typeof result[0]?.motorista_id);
        }

        console.log(`\n🔍 Testing access to 'motoristas' collection directly...`);
        // Note: I'm assuming the collection name is 'motoristas' (plural) based on conventions, 
        // but if the ID is 488, it might be 'motorista' or something else.
        // Let's try 'motoristas' first.
        try {
            const driver = await client.request(
                readItems('motoristas', {
                    limit: 1,
                    access_token: directusToken
                })
            );
            console.log(`✅ Access to 'motoristas' OK. Found ${driver.length} items.`);
        } catch (err) {
            console.log(`❌ Failed to access 'motoristas': ${err.message}`);
        }

    } catch (error) {
        console.error('❌ Query failed:', error.message);
    }
}

debugRelation();
