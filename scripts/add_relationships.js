import { createDirectus, rest, staticToken, readFields, createField, createRelation } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";
const PARENT_TABLE = 'cadastro_motorista';
const CHILD_TABLES = [
    'cnh',
    'crlv',
    'antt',
    'comprovante_endereco',
    'carreta_1',
    'carreta_2',
    'carreta_3',
    'status',
    'check_list'
];

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

async function connectTables() {
    console.log(`Connecting tables to ${PARENT_TABLE}...`);

    try {
        // 1. Check Parent ID Type
        const parentFields = await client.request(readFields(PARENT_TABLE));
        const idField = parentFields.find(f => f.field === 'id');
        const idType = idField.type; // 'integer' or 'uuid' usually
        console.log(`✅ Parent ID Type detected: ${idType}`);

        for (const childTable of CHILD_TABLES) {
            console.log(`\nProcessing ${childTable}...`);

            // 2. Create Foreign Key Field
            const fieldName = 'motorista_id';
            try {
                await client.request(createField(childTable, {
                    field: fieldName,
                    type: idType, // Must match parent PK type
                    meta: {
                        interface: 'select-dropdown-m2o', // Better UI for selection
                        display: 'related-values', // Show related data
                        special: ['m2o'], // Mark as Many-to-One
                        accordion_open: false
                    },
                    schema: {
                        // is_nullable: true // Optional
                    }
                }));
                console.log(`  ✅ Field ${fieldName} created.`);
            } catch (err) {
                if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                    console.log(`  ⚠️ Field ${fieldName} already exists.`);
                } else {
                    console.error(`  ❌ Failed to create field: ${err.message}`);
                    continue;
                }
            }

            // 3. Create Relationship
            // This tells Directus that 'motorista_id' points to 'cadastro_motorista.id'
            try {
                await client.request(createRelation({
                    collection: childTable,
                    field: fieldName,
                    related_collection: PARENT_TABLE,
                    schema: {
                        on_delete: 'SET NULL', // or CASCADE
                    },
                    meta: {
                        // Optional: Configure how it looks on the parent side (O2M)
                        one_field: null, // If we wanted a list on the driver page, we'd name this field (e.g. 'cnhs')
                        sort_field: null,
                        one_deselect_action: 'nullify',
                    }
                }));
                console.log(`  ✅ Relationship linked!`);
            } catch (err) {
                if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                    console.log(`  ⚠️ Relationship already exists.`);
                } else {
                    console.error(`  ❌ Failed to link relationship: ${err.message}`);
                }
            }
        }
        console.log("\n✨ All tables connected!");

    } catch (err) {
        console.error(`❌ Global Error:`, err);
    }
}

connectTables();
