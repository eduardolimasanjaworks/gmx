import { createDirectus, rest, staticToken, readItems } from '@directus/sdk';

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

const directus = createDirectus(DIRECTUS_URL).with(staticToken(DIRECTUS_TOKEN)).with(rest());

async function check() {
    const embarques = await directus.request(readItems('embarques', {
        fields: ['id', 'status', 'driver_id']
    }));

    console.log('Embarques with drivers:');
    const withDrivers = embarques.filter(e => e.driver_id);
    console.log(withDrivers);

    if (withDrivers.length > 0) {
        const driverIds = withDrivers.map(e => typeof e.driver_id === 'object' && e.driver_id !== null ? e.driver_id.id : e.driver_id);
        console.log('Driver IDs:', driverIds);

        try {
            const disponiveis = await directus.request(readItems('disponivel', {
                filter: {
                    motorista_id: { _in: driverIds }
                }
            }));

            console.log('Disponiveis for these drivers:');
            console.log(disponiveis.map(d => ({ id: d.id, motorista_id: d.motorista_id, status: d.status, date_created: d.date_created, localizacao_atual: d.localizacao_atual })));
        } catch (err) {
            console.log("Error fetching disponiveis:", err.message);
        }
    } else {
        console.log('No embarques with drivers found.');
    }
}

check().catch(console.error);
