import { createDirectus, rest, staticToken, updatePermission, readPermissions, createPermission } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function setPublicRead(collection) {
    console.log(`Setting public read for ${collection}...`);
    try {
        const publicRole = await client.request(readPermissions({
            filter: {
                role: { _null: true }, // Public role
                collection: { _eq: collection },
                action: { _eq: 'read' }
            }
        }));

        if (publicRole.length > 0) {
            await client.request(updatePermission(publicRole[0].id, {
                fields: ['*']
            }));
            console.log(`Updated existing permission for ${collection}`);
        } else {
            await client.request(createPermission({
                role: null,
                collection: collection,
                action: 'read',
                fields: ['*']
            }));
            console.log(`Created permission for ${collection}`);
        }
    } catch (err) {
        console.error(`Error setting permission for ${collection}:`, err.message);
    }
}

async function run() {
    await setPublicRead('cadastro_motorista');
    await setPublicRead('disponivel');
}

run();
