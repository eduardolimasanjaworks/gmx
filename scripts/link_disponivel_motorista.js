import { createDirectus, rest, staticToken, updateField, createRelation } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const PARENT_TABLE = 'cadastro_motorista';
const CHILD_TABLE = 'disponivel';
const FIELD_NAME = 'motorista_id';

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function linkDisponivel() {
    console.log(`Linking ${CHILD_TABLE}.${FIELD_NAME} to ${PARENT_TABLE}...`);

    try {
        // 1. Update Field Metadata to look like a Relationship (M2O)
        console.log("Updating field metadata...");
        try {
            await client.request(updateField(CHILD_TABLE, FIELD_NAME, {
                meta: {
                    interface: 'select-dropdown-m2o',
                    special: ['m2o'],
                    display: 'related-values',
                    display_options: {
                        template: "{{nome}} {{sobrenome}}" // Nice display for the driver
                    }
                }
            }));
            console.log("✅ Field metadata updated.");
        } catch (err) {
            console.error("❌ Failed to update field metadata:", err.message);
        }

        // 2. Create Relationship Object
        console.log("Creating relationship...");
        try {
            await client.request(createRelation({
                collection: CHILD_TABLE,
                field: FIELD_NAME,
                related_collection: PARENT_TABLE,
                schema: {
                    on_delete: 'SET NULL'
                },
                meta: {
                    one_field: null, // Don't enforce O2M on the other side for now unless needed
                    one_deselect_action: 'nullify'
                }
            }));
            console.log("✅ Relationship created!");
        } catch (err) {
            if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                console.log("⚠️ Relationship already exists.");
            } else {
                console.error("❌ Failed to create relationship:", err.message);
                // Print more detail if available
                if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
            }
        }

    } catch (err) {
        console.error("❌ Global Error:", err);
    }
}

linkDisponivel();
