
import { createDirectus, rest, staticToken, createPermission, readPermissions, updatePermission } from '@directus/sdk';

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

const ACTIONS = ['create', 'read', 'update', 'delete'];

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function forcePublic() {
    console.log("🔓 Forcing Public Access (No Auth Required)...");

    try {
        const existingPermissions = await client.request(readPermissions({ limit: -1 }));

        for (const table of TABLES) {
            console.log(`\nConfiguring ${table}...`);

            for (const action of ACTIONS) {
                // Check if permission exists for public (role: null)
                const exists = existingPermissions.find(p =>
                    p.collection === table &&
                    p.action === action &&
                    p.role === null
                );

                if (exists) {
                    console.log(`  🔹 ${action} already active.`);
                } else {
                    console.log(`  ➕ Granting ${action}...`);
                    try {
                        await client.request(createPermission({
                            role: null,
                            collection: table,
                            action: action,
                            permissions: {},     // No specific record constraints
                            fields: ['*']        // Allow all fields
                        }));
                        console.log(`     ✅ Granted.`);
                    } catch (e) {
                        console.error(`     ❌ Failed: ${e.message}`);
                    }
                }
            }
        }
        console.log("\n✨ Public access configuration complete.");

    } catch (err) {
        console.error("Global Error:", err);
    }
}

forcePublic();
