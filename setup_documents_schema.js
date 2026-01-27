
import http from 'http';

const CONFIG = {
    hostname: '91.99.137.101',
    port: 8057,
    token: '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah'
};

const COLLECTIONS = [
    {
        collection: 'delivery_receipts',
        meta: { note: 'Canhotos de entrega e comprovantes', icon: 'receipt_long' },
        fields: [
            { field: 'file_url', type: 'string', meta: { interface: 'input', width: 'full' } }, // Legacy/Supabase compat
            { field: 'file_name', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'file_size', type: 'integer', meta: { interface: 'input', width: 'half' } },
            { field: 'verified', type: 'boolean', meta: { interface: 'boolean', width: 'half' } },
            { field: 'ocr_raw_data', type: 'json', meta: { interface: 'input-json', width: 'full' } },
            { field: 'delivery_date', type: 'date', meta: { interface: 'datetime', width: 'half' } },
            { field: 'delivery_time', type: 'time', meta: { interface: 'time', width: 'half' } },
            { field: 'receiver_name', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'receiver_signature', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'observations', type: 'text', meta: { interface: 'input-multiline', width: 'full' } },
            { field: 'shipment_id', type: 'integer', meta: { interface: 'select-dropdown-m2o', width: 'half' } },
            // Directus native file link
            { field: 'file', type: 'uuid', meta: { interface: 'file', width: 'half' } }
        ]
    },
    {
        collection: 'payment_receipts',
        meta: { note: 'Comprovantes de pagamento (adiantamentos/saldos)', icon: 'payments' },
        fields: [
            { field: 'file_url', type: 'string', meta: { interface: 'input', width: 'full' } },
            { field: 'file_name', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'file_size', type: 'integer', meta: { interface: 'input', width: 'half' } },
            {
                field: 'receipt_type', type: 'string', meta: {
                    interface: 'select-dropdown', options: {
                        choices: [
                            { text: 'Adiantamento', value: 'advance_payment' },
                            { text: 'Saldo', value: 'balance_payment' }
                        ]
                    }
                }
            },
            { field: 'shipment_id', type: 'integer', meta: { interface: 'select-dropdown-m2o', width: 'half' } },
            // Directus native file link
            { field: 'file', type: 'uuid', meta: { interface: 'file', width: 'half' } }
        ]
    },
    {
        collection: 'shipment_documents',
        meta: { note: 'Documentos gerais do embarque (NF-e, CTe, etc)', icon: 'description' },
        fields: [
            { field: 'file_url', type: 'string', meta: { interface: 'input', width: 'full' } },
            { field: 'file_name', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'file_size', type: 'integer', meta: { interface: 'input', width: 'half' } },
            { field: 'document_title', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'document_type', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'shipment_id', type: 'integer', meta: { interface: 'select-dropdown-m2o', width: 'half' } },
            // Directus native file link
            { field: 'file', type: 'uuid', meta: { interface: 'file', width: 'half' } }
        ]
    }
];

const RELATIONS = [
    // Link keys
    {
        collection: 'delivery_receipts',
        field: 'shipment_id',
        related_collection: 'embarques',
        schema: { on_delete: 'CASCADE' }
    },
    {
        collection: 'payment_receipts',
        field: 'shipment_id',
        related_collection: 'embarques',
        schema: { on_delete: 'CASCADE' }
    },
    {
        collection: 'shipment_documents',
        field: 'shipment_id',
        related_collection: 'embarques',
        schema: { on_delete: 'CASCADE' }
    },
    // File Relations (M2O to directus_files)
    {
        collection: 'delivery_receipts',
        field: 'file',
        related_collection: 'directus_files',
        schema: { on_delete: 'SET NULL' }
    },
    {
        collection: 'payment_receipts',
        field: 'file',
        related_collection: 'directus_files',
        schema: { on_delete: 'SET NULL' }
    },
    {
        collection: 'shipment_documents',
        field: 'file',
        related_collection: 'directus_files',
        schema: { on_delete: 'SET NULL' }
    }
];

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CONFIG.hostname,
            port: CONFIG.port,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        // Resolve null for non-critical errors (like collection already exists)
                        console.log(`Note: ${path} returned ${res.statusCode} (likely exists)`);
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log("Starting Document Schema Creation...");

    for (const col of COLLECTIONS) {
        console.log(`Creating collection [${col.collection}]...`);
        await request('POST', '/collections', {
            collection: col.collection,
            meta: col.meta,
            schema: {}
        });

        for (const field of col.fields) {
            process.stdout.write('.');
            await request('POST', '/fields/' + col.collection, field);
            await sleep(100);
        }
        console.log('');
    }

    console.log("Creating Relations...");
    for (const rel of RELATIONS) {
        await request('POST', '/relations', rel);
        await sleep(100);
    }

    console.log("Done.");
}

run();
