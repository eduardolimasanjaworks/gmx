import { createDirectus, rest, staticToken, createField, updateCollection } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const TABLE_NAME = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function fixMissingSystemFields() {
    console.log(`Fixing system fields for: ${TABLE_NAME}...`);

    try {
        // 1. Create date_created field
        console.log("  Creating field date_created...");
        await client.request(createField(TABLE_NAME, {
            field: 'date_created',
            type: 'timestamp',
            schema: {
                default_value: 'now()'
            },
            meta: {
                interface: 'datetime',
                readonly: true,
                hidden: true, // Hide from main input forms usually, but visible in table
                width: 'half',
                display: 'datetime',
                special: ['date-created'] // Mark as system field
            }
        }));
        console.log("  ✅ Field date_created created.");

        // 2. Create date_updated field
        console.log("  Creating field date_updated...");
        await client.request(createField(TABLE_NAME, {
            field: 'date_updated',
            type: 'timestamp',
            meta: {
                interface: 'datetime',
                readonly: true,
                hidden: true,
                width: 'half',
                display: 'datetime',
                special: ['date-updated'] // Mark as system field
            }
        }));
        console.log("  ✅ Field date_updated created.");

        // 3. Create user_created field (optional but good)
        console.log("  Creating field user_created...");
        await client.request(createField(TABLE_NAME, {
            field: 'user_created',
            type: 'uuid',
            meta: {
                interface: 'user',
                readonly: true,
                hidden: true,
                special: ['user-created']
            }
        }));
        console.log("  ✅ Field user_created created.");

        // 4. Create user_updated field (optional but good)
        console.log("  Creating field user_updated...");
        await client.request(createField(TABLE_NAME, {
            field: 'user_updated',
            type: 'uuid',
            meta: {
                interface: 'user',
                readonly: true,
                hidden: true,
                special: ['user-updated']
            }
        }));
        console.log("  ✅ Field user_updated created.");

    } catch (err) {
        if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
            console.log("  ⚠️ Some fields already exist. That's fine.");
        } else {
            console.error(`  ❌ Failed to create fields:`, err);
        }
    }
}

fixMissingSystemFields();
