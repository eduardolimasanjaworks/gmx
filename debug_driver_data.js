import { createDirectus, rest, readItems } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directusToken = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn';

const client = createDirectus(directusUrl).with(rest());

async function debugDriverData() {
    console.log(`🔍 Debugging data for Driver ID 488...`);

    // 1. Check 'cadastro_motorista' access
    try {
        console.log(`\nTesting 'cadastro_motorista' access...`);
        const driver = await client.request(readItems('cadastro_motorista', {
            filter: { id: { _eq: 488 } },
            limit: 1,
            access_token: directusToken
        }));
        if (driver.length > 0) {
            console.log(`✅ Driver found in 'cadastro_motorista': ${driver[0].nome}`);
        } else {
            console.log(`⚠️ Access OK, but driver 488 not found.`);
        }
    } catch (err) {
        console.error(`❌ Failed to access 'cadastro_motorista': ${err.message}`);
    }

    // 2. Check Vehicles
    const vehicleCollections = ['crlv', 'carreta_1', 'carreta_2', 'carreta_3'];

    for (const col of vehicleCollections) {
        try {
            const vehicles = await client.request(readItems(col, {
                filter: { motorista_id: { _eq: 488 } },
                limit: 1,
                access_token: directusToken
            }));
            if (vehicles.length > 0) {
                console.log(`✅ Found vehicle in '${col}':`, JSON.stringify(vehicles[0], null, 2));
            } else {
                console.log(`ℹ️ No vehicle in '${col}' for driver 488.`);
            }
        } catch (err) {
            console.error(`❌ Error checking '${col}': ${err.message}`);
        }
    }

    // 3. Check for orphans in 'disponivel'
    try {
        const orphans = await client.request(readItems('disponivel', {
            filter: {
                disponivel: { _eq: true },
                motorista_id: { _null: true }
            },
            limit: 5,
            access_token: directusToken
        }));
        if (orphans.length > 0) {
            console.log(`\n⚠️ Found ${orphans.length} available records WITHOUT a driver link! IDs: ${orphans.map(o => o.id).join(', ')}`);
        } else {
            console.log(`\n✅ All available records seem to have a driver link.`);
        }
    } catch (err) {
        console.error(`❌ Error checking orphans: ${err.message}`);
    }
}

debugDriverData();
