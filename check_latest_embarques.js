import { createDirectus, rest, readItems, staticToken } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const directusToken = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const client = createDirectus(directusUrl).with(staticToken(directusToken)).with(rest());

async function checkEmbarques() {
    try {
        const items = await client.request(
            readItems('embarques', {
                limit: 2,
                sort: ['-date_created']
            })
        );
        console.log("Últimos embarques:");
        console.log(JSON.stringify(items, null, 2));
    } catch (error) {
        console.error("Erro:", error.message);
    }
}

checkEmbarques();
