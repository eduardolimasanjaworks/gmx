
import { createDirectus, rest, staticToken, createPermission, readRoles } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const TABLES = [
    'cadastro_motorista',
    'fotos',
    'cnh',
    'antt',
    'crlv',
    'comprovante_endereco',
    'carreta_1',
    'carreta_2',
    'carreta_3',
    'disponivel'
];

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function setAllPermissions() {
    console.log(`Setting Public Permissions for ALL tables...`);

    for (const table of TABLES) {
        console.log(` Processing ${table}...`);
        const actions = ['read', 'create', 'update', 'delete'];

        for (const action of actions) {
            try {
                await client.request(createPermission({
                    role: null, // Public Role
                    collection: table,
                    action: action,
                    permissions: {},
                    validation: {}
                }));
                console.log(`  ✅ ${action} granted.`);
            } catch (err) {
                if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                    // Already exists, ignore
                } else {
                    console.error(`  ❌ Failed to grant ${action} for ${table}:`, err.message);
                }
            }
        }
    }
    console.log('✨ All Permissions updated!');
}

setAllPermissions();
