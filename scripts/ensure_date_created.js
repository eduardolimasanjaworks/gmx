import { createDirectus, rest, staticToken, readCollections, createField, updateField } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function ensureDateCreated() {
    console.log("Checking all user tables for 'date_created' field...");

    try {
        const collections = await client.request(readCollections());
        const userCollections = collections
            .filter(c => !c.collection.startsWith('directus_'))
            .map(c => c.collection);

        console.log(`Found ${userCollections.length} tables: ${userCollections.join(', ')}`);

        for (const table of userCollections) {
            console.log(`\nProcessing table: ${table}`);

            const fieldConfig = {
                field: 'date_created',
                type: 'timestamp',
                schema: {
                    default_value: 'now()',
                },
                meta: {
                    interface: 'datetime',
                    readonly: true,
                    hidden: true,
                    special: ['date-created'] // This is the magic string
                }
            };

            try {
                await client.request(createField(table, fieldConfig));
                console.log(`  ✅ Field created successfully.`);
            } catch (err) {
                const code = err?.errors?.[0]?.code;

                // If field exists, we update it
                if (code === 'RECORD_NOT_UNIQUE' || code === 'INVALID_PAYLOAD' || (err.message && err.message.includes('exists'))) {
                    console.log(`  ⚠️ Field exists. Updating to ensure correct auto-date behavior...`);
                    try {
                        await client.request(updateField(table, 'date_created', {
                            schema: { default_value: 'now()' },
                            meta: { special: ['date-created'] }
                        }));
                        console.log(`  ✅ Field updated.`);
                    } catch (updateErr) {
                        console.error(`  ❌ Failed to update field: ${updateErr.message}`);
                    }
                } else {
                    console.error(`  ❌ Failed to create field. Code: ${code}`);
                    console.error(JSON.stringify(err, null, 2));
                }
            }
        }
    } catch (err) {
        console.error("Global Error:", err);
    }
}

ensureDateCreated();
