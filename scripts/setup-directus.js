import { createDirectus, rest, staticToken, createCollection, createField } from '@directus/sdk';

// Config
const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const SCHEMA = [
    {
        collection: 'drivers',
        schema: { name: 'drivers' },
        meta: { singleton: false, sort_field: 'created_at' },
        fields: [
            { field: 'name', type: 'string', meta: { interface: 'input', required: true } },
            { field: 'cpf', type: 'string', meta: { interface: 'input' } },
            { field: 'phone', type: 'string', meta: { interface: 'input' } },
            { field: 'email', type: 'string', meta: { interface: 'input' } },
            { field: 'truck_plate', type: 'string', meta: { interface: 'input' } },
            { field: 'trailer_plate_1', type: 'string', meta: { interface: 'input' } },
            { field: 'trailer_plate_2', type: 'string', meta: { interface: 'input' } },
            { field: 'trailer_plate_3', type: 'string', meta: { interface: 'input' } },
            { field: 'vehicle_type', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Truck', value: 'truck' }, { text: 'Van', value: 'van' }] } } }, // Simplified options
            { field: 'current_location', type: 'string', meta: { interface: 'input' } },
            { field: 'city', type: 'string', meta: { interface: 'input' } },
            { field: 'state', type: 'string', meta: { interface: 'input' } },
            { field: 'status', type: 'string', schema: { default_value: 'active' }, meta: { interface: 'select-dropdown' } },
            { field: 'availability_status', type: 'string', schema: { default_value: 'available' }, meta: { interface: 'select-dropdown' } },
            { field: 'registered_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime' } },
            { field: 'last_freight_date', type: 'timestamp', meta: { interface: 'datetime' } },
            { field: 'last_update', type: 'timestamp', meta: { interface: 'datetime' } },
            { field: 'metadata', type: 'json', schema: { default_value: {} }, meta: { interface: 'code' } }
        ]
    },
    {
        collection: 'driver_field_config',
        schema: { name: 'driver_field_config' },
        meta: { singleton: false },
        fields: [
            { field: 'field_name', type: 'string', meta: { interface: 'input', required: true } },
            { field: 'display_name', type: 'string', meta: { interface: 'input', required: true } },
            { field: 'field_type', type: 'string', schema: { default_value: 'text' }, meta: { interface: 'select-dropdown' } },
            { field: 'visible_in_card', type: 'boolean', schema: { default_value: false }, meta: { interface: 'boolean' } },
            { field: 'visible_in_table', type: 'boolean', schema: { default_value: false }, meta: { interface: 'boolean' } },
            { field: 'display_order', type: 'integer', schema: { default_value: 0 }, meta: { interface: 'input' } }
        ]
    },
    {
        collection: 'driver_documents',
        schema: { name: 'driver_documents' },
        meta: { singleton: false },
        fields: [
            { field: 'driver_id', type: 'uuid', meta: { interface: 'input', note: 'Foreign Key to Drivers effectively' } }, // Relationship handled separately usually, but basic field first
            { field: 'document_type', type: 'string', meta: { interface: 'input', required: true } },
            { field: 'image_url', type: 'string', meta: { interface: 'image' }, schema: {} }, // Actually Directus uses 'file' type for actual files, but keeping string URL for compatibility if external
            { field: 'document_number', type: 'string', meta: { interface: 'input' } },
            { field: 'issuing_agency', type: 'string', meta: { interface: 'input' } },
            { field: 'issue_date', type: 'date', meta: { interface: 'date' } },
            { field: 'expiry_date', type: 'date', meta: { interface: 'date' } },
            { field: 'verified', type: 'boolean', schema: { default_value: false }, meta: { interface: 'boolean' } },
            { field: 'ocr_raw_data', type: 'json', meta: { interface: 'code' } }
        ]
    },
    {
        collection: 'embarques',
        schema: { name: 'embarques' },
        meta: { singleton: false },
        fields: [
            { field: 'email_id', type: 'string', meta: { interface: 'input' } },
            { field: 'status', type: 'string', schema: { default_value: 'new' }, meta: { interface: 'select-dropdown' } },
            { field: 'origin', type: 'string', meta: { interface: 'input', required: true } },
            { field: 'destination', type: 'string', meta: { interface: 'input' } },
            { field: 'cargo_type', type: 'string', meta: { interface: 'input' } },
            { field: 'weight', type: 'float', meta: { interface: 'input' } },
            { field: 'client_name', type: 'string', meta: { interface: 'input' } },
            { field: 'total_value', type: 'float', meta: { interface: 'input' } },
            { field: 'driver_value', type: 'float', meta: { interface: 'input' } },
            { field: 'driver_id', type: 'uuid', meta: { interface: 'input' } },
            { field: 'pickup_date', type: 'timestamp', meta: { interface: 'datetime' } },
            { field: 'delivery_date', type: 'timestamp', meta: { interface: 'datetime' } },
            { field: 'delivery_window_start', type: 'timestamp', meta: { interface: 'datetime' } },
            { field: 'delivery_window_end', type: 'timestamp', meta: { interface: 'datetime' } },
            { field: 'actual_arrival_time', type: 'timestamp', meta: { interface: 'datetime' } },
            { field: 'current_latitude', type: 'float', meta: { interface: 'input' } },
            { field: 'current_longitude', type: 'float', meta: { interface: 'input' } },
            { field: 'last_location_update', type: 'timestamp', meta: { interface: 'datetime' } },
            { field: 'rejected_drivers_count', type: 'integer', schema: { default_value: 0 }, meta: { interface: 'input' } }
        ]
    },
    {
        collection: 'delivery_receipts',
        schema: { name: 'delivery_receipts' },
        meta: { singleton: false },
        fields: [
            { field: 'shipment_id', type: 'uuid', meta: { interface: 'input' } },
            { field: 'image_url', type: 'string', meta: { interface: 'image', required: true } },
            { field: 'delivery_date', type: 'date', meta: { interface: 'date' } },
            { field: 'delivery_time', type: 'time', meta: { interface: 'time' } },
            { field: 'receiver_name', type: 'string', meta: { interface: 'input' } },
            { field: 'receiver_signature', type: 'string', meta: { interface: 'input' } },
            { field: 'observations', type: 'text', meta: { interface: 'textarea' } },
            { field: 'verified', type: 'boolean', schema: { default_value: false }, meta: { interface: 'boolean' } },
            { field: 'ocr_raw_data', type: 'json', meta: { interface: 'code' } }
        ]
    },
    {
        collection: 'message_templates',
        schema: { name: 'message_templates' },
        meta: { singleton: false },
        fields: [
            { field: 'name', type: 'string', meta: { interface: 'input', required: true } },
            { field: 'description', type: 'text', meta: { interface: 'textarea' } },
            { field: 'template_type', type: 'string', meta: { interface: 'input', required: true } },
            { field: 'message_text', type: 'text', meta: { interface: 'textarea', required: true } },
            { field: 'variables', type: 'json', schema: { default_value: [] }, meta: { interface: 'code' } },
            { field: 'active', type: 'boolean', schema: { default_value: true }, meta: { interface: 'boolean' } }
        ]
    },
    {
        collection: 'ranking_rules',
        schema: { name: 'ranking_rules' },
        meta: { singleton: false },
        fields: [
            { field: 'name', type: 'string', meta: { interface: 'input', required: true } },
            { field: 'rule_type', type: 'string', meta: { interface: 'input', required: true } },
            { field: 'description', type: 'text', meta: { interface: 'textarea' } },
            { field: 'weight', type: 'integer', schema: { default_value: 1 }, meta: { interface: 'input', required: true } },
            { field: 'enabled', type: 'boolean', schema: { default_value: true }, meta: { interface: 'boolean' } },
            { field: 'parameters', type: 'json', schema: { default_value: {} }, meta: { interface: 'code' } }
        ]
    }
];

async function setupDirectus() {
    console.log('Starting Directus Setup...');

    for (const table of SCHEMA) {
        console.log(`Creating collection: ${table.collection}...`);
        try {
            await client.request(createCollection({
                collection: table.collection,
                meta: table.meta,
                schema: table.schema,
                fields: [
                    // Standard fields usually created by Directus automatically if we don't specify them, 
                    // but we can ensure they exist by creating the collection with fields if supported, 
                    // or adding them after. The createCollection logic in SDK usually takes the basic creation.
                    // We'll Create Collection first, then Create Fields one by one to be safe and debuggable.
                ]
            }));
            console.log(`✅ Collection ${table.collection} created.`);
        } catch (err) {
            if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                console.log(`⚠️ Collection ${table.collection} already exists.`);
            } else {
                console.error(`❌ Failed to create collection ${table.collection}:`, err);
                // Continue to next table? Or stop? Continue.
            }
        }

        // Create Fields
        for (const field of table.fields) {
            console.log(`  Creating field ${field.field} in ${table.collection}...`);
            try {
                await client.request(createField(table.collection, {
                    field: field.field,
                    type: field.type,
                    meta: field.meta,
                    schema: field.schema
                }));
                console.log(`  ✅ Field ${field.field} created.`);
            } catch (err) {
                if (err?.errors?.[0]?.code === 'RECORD_NOT_UNIQUE') {
                    console.log(`  Basic field ${field.field} already exists (skipping).`);
                } else {
                    console.error(`  ❌ Failed to create field ${field.field}:`, err.message);
                }
            }
        }
    }

    console.log('✨ Setup complete!');
}

setupDirectus();
