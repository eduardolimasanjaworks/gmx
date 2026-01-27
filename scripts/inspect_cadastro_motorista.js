
import { createDirectus, rest, readFields, readItems } from '@directus/sdk';
import 'dotenv/config';

const client = createDirectus(process.env.VITE_DIRECTUS_URL)
    .with(rest())
    .withToken(process.env.VITE_DIRECTUS_TOKEN);

async function inspect() {
    try {
        console.log('Inspecting cadastro_motorista...');

        // Get Fields
        const fields = await client.request(readFields('cadastro_motorista'));
        console.log('--- FIELDS ---');
        fields.forEach(f => {
            console.log(`- ${f.field} (${f.type})`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

inspect();
