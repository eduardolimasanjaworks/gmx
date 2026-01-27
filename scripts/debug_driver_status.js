import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function inspectDriver() {
    // Buscar o motorista 'teste 3 3' (ou listar para achar o ID)
    try {
        const drivers = await client.request(readItems('cadastro_motorista', {
            limit: 10,
            fields: ['id', 'nome', 'sobrenome', 'status', 'disponivel.id', 'disponivel.status', 'disponivel.date_created']
        }));

        drivers.forEach(driver => {
            console.log(`\nDriver: ${driver.nome} ${driver.sobrenome} (ID: ${driver.id})`);
            console.log(`Root Status: ${driver.status}`);

            if (driver.disponivel && driver.disponivel.length > 0) {
                // Sort locally to see the real latest
                const sorted = driver.disponivel.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
                console.log(`Latest O2M: ${sorted[0].status} (${sorted[0].date_created})`);
                console.log(`History Count: ${driver.disponivel.length}`);
            } else {
                console.log('O2M Disponivel: EMPTY');
            }
        });

    } catch (err) {
        console.error(err);
    }
}

inspectDriver();
