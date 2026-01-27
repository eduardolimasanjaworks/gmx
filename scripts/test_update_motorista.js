
import { createDirectus, rest, staticToken, readItems, updateItem } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function testUpdate() {
    try {
        console.log("Fetching drivers...");
        const drivers = await client.request(readItems('cadastro_motorista', { limit: 1 }));

        if (drivers.length === 0) {
            console.log("No drivers found.");
            return;
        }

        const driver = drivers[0];
        console.log(`Driver found: ID=${driver.id}, Nome=${driver.nome}, Sobrenome=${driver.sobrenome}`);

        const newSobrenome = `Teste ${Date.now()}`;
        console.log(`Updating sobrenome to: ${newSobrenome}`);

        await client.request(updateItem('cadastro_motorista', driver.id, {
            sobrenome: newSobrenome
        }));

        console.log("Update requested. Fetching again to verify...");
        const updatedDriver = await client.request(readItems('cadastro_motorista', {
            filter: { id: { _eq: driver.id } }
        }));

        console.log(`Driver updated: ID=${updatedDriver[0].id}, Sobrenome=${updatedDriver[0].sobrenome}`);

        if (updatedDriver[0].sobrenome === newSobrenome) {
            console.log("SUCCESS: Driver updated correctly via SDK.");
        } else {
            console.error("FAILURE: Driver did not update.");
        }

    } catch (err) {
        console.error("ERROR during update test:", err);
    }
}

testUpdate();
