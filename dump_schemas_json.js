import { rest } from '@directus/sdk';
import fs from 'fs';

const directusUrl = 'http://91.99.137.101:8057';
const token = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function fetchFields(collection) {
    try {
        const response = await fetch(`${directusUrl}/fields/${collection}?access_token=${token}`);
        const result = await response.json();
        return result.data.map(f => ({ field: f.field, type: f.type }));
    } catch (e) {
        return [];
    }
}

async function run() {
    const schemas = {
        disponivel: await fetchFields('disponivel'),
        follow: await fetchFields('follow'),
        embarques: await fetchFields('embarques')
    };
    fs.writeFileSync('schemas.json', JSON.stringify(schemas, null, 2));
}

run();
