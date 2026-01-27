import { createDirectus, rest, staticToken, readFields } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function listFields() {
    try {
        const fields = await client.request(readFields('cadastro_motorista'));
        console.log('Fields in cadastro_motorista:');
        fields.forEach(f => {
            console.log(`- ${f.field} (Type: ${f.type})`);
        });

        const hasDisponivel = fields.find(f => f.field === 'disponivel');
        console.log('\nHas "disponivel" alias?', hasDisponivel ? 'YES' : 'NO');

    } catch (err) {
        console.error(err);
    }
}

listFields();
