
import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function verify() {
    try {
        const drivers = await client.request(readItems('cadastro_motorista', {
            filter: {
                nome: { _eq: 'MOTORISTA V4 FINAL' }
            },
            fields: ['id', 'nome', 'fotos.*']
        }));

        if (drivers.length === 0) {
            console.log("RESULT: NOT FOUND");
            return;
        }

        const driver = drivers[0];
        console.log(`RESULT: FOUND ID ${driver.id}`);

        const checks = [
            { name: 'Fotos', data: driver.fotos },
            { name: 'Carreta 1', data: driver.carreta1 },
            { name: 'CNH', data: driver.dados_cnh },
            { name: 'ANTT', data: driver.dados_antt },
            { name: 'Endereço', data: driver.dados_endereco }
        ];

        checks.forEach(c => {
            if (c.data && c.data.length > 0) {
                console.log(`CHECK ${c.name}: OK (Count: ${c.data.length}) - ID: ${c.data[0].id} - FK: ${c.data[0].motorista_id || 'N/A'}`);
            } else {
                console.log(`CHECK ${c.name}: FAIL (Empty/Missing)`);
                console.log("Raw Data:", JSON.stringify(c.data)); // specifics
            }
        });

    } catch (e) {
        console.error("ERROR:", e.message);
    }
}

verify();
