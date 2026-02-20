import { createDirectus, rest, readItems } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directusToken = '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn';

const client = createDirectus(directusUrl).with(rest());

async function inspectDriver() {
    console.log(`🔍 Inspecting ALL fields for Driver 488...`);
    try {
        const driver = await client.request(readItems('cadastro_motorista', {
            filter: { id: { _eq: 488 } },
            limit: 1,
            access_token: directusToken,
            fields: ['*'] // Fetch properly to see if 'placa', 'veiculo', etc exist
        }));

        if (driver.length > 0) {
            console.log(JSON.stringify(driver[0], null, 2));
            console.log('Keys:', Object.keys(driver[0]).join(', '));
        } else {
            console.log('Driver not found');
        }
    } catch (err) {
        console.error(err);
    }
}

inspectDriver();
