import { createDirectus, rest } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const token = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function fetchFields(collection) {
    try {
        const response = await fetch(`${directusUrl}/fields/${collection}?access_token=${token}`);
        const result = await response.json();
        console.log(`\n--- Fields for ${collection} ---`);
        result.data.forEach(f => {
            console.log(`- ${f.field} (${f.type})`);
        });
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await fetchFields('disponivel');
    await fetchFields('follow');
    await fetchFields('embarques');
}

run();
