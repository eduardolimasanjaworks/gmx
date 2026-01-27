
import { createDirectus, rest, staticToken, readFields, createField } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function fixMissingSystemFields() {
    try {
        console.log("Checking fields for 'fotos'...");
        const fields = await client.request(readFields('fotos'));
        const fieldNames = fields.map(f => f.field);
        console.log("Current fields:", fieldNames.join(', '));

        const systemFields = ['date_created', 'date_updated'];

        for (const sysField of systemFields) {
            if (!fieldNames.includes(sysField)) {
                console.log(`⚠️ Missing ${sysField}. Creating it...`);
                try {
                    await client.request(createField('fotos', {
                        field: sysField,
                        type: 'timestamp',
                        meta: {
                            interface: 'datetime',
                            readonly: true,
                            hidden: true,
                            special: [sysField.replace('_', '-')], // date-created, date-updated
                            display: 'datetime',
                            display_options: { relative: true }
                        },
                        schema: {
                            default_value: 'now()' // Postgres/Directus default
                        }
                    }));
                    console.log(`✅ Created ${sysField}`);
                } catch (err) {
                    console.error(`❌ Failed to create ${sysField}:`, err.message);
                }
            } else {
                console.log(`✅ ${sysField} already exists.`);
            }
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

fixMissingSystemFields();
