
import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function verify() {
    try {
        console.log("Searching for 'MOTORISTA V4 FINAL'...");
        const drivers = await client.request(readItems('cadastro_motorista', {
            filter: {
                nome: { _eq: 'MOTORISTA V4 FINAL' }
            },
            fields: ['id', 'nome', 'fotos.*', 'carreta1.*', 'dados_cnh.*', 'dados_antt.*', 'dados_endereco.*']
        }));

        if (drivers.length === 0) {
            console.log("❌ Driver NOT found.");
            return;
        }

        const driver = drivers[0];
        console.log("✅ Driver found:", driver.id);

        function checkRel(name, data) {
            if (data && data.length > 0) {
                console.log(`✅ ${name} relation populated. (Count: ${data.length})`);
                console.log(`   First ID: ${data[0].id}`);
                // Note: motorista_id might not always be returned in the nested object depending on recursion depth/permissions, but existence of object proves the link.
                // We will try to print it if available.
                if (data[0].motorista_id) console.log(`   Motorista ID (FK): ${data[0].motorista_id}`);
            } else {
                console.log(`❌ ${name} relation MISSING or EMPTY.`);
            }
        }

        checkRel('Fotos', driver.fotos);
        // Note: The payload sends "carreta1" but the DB table is "carreta_1". Directus alias "carreta1" usually maps to the field "carreta_1" (if setup via O2M) 
        // OR the user meant "carreta1" as the alias in cadastro_motorista.
        // My fix script set the alias to 'carreta1' for table 'carreta_1'.
        checkRel('Carreta 1', driver.carreta1);
        checkRel('CNH', driver.dados_cnh);
        checkRel('ANTT', driver.dados_antt);
        checkRel('Endereço', driver.dados_endereco);

    } catch (e) {
        console.error("Error:", e);
    }
}

verify();
