
import http from 'http';

const CONFIG = {
    hostname: '91.99.137.101',
    port: 8057,
    token: '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah'
};

const COLLECTIONS = [
    {
        collection: 'embarques',
        meta: { note: 'Tabela principal de gestão de cargas e fretes', icon: 'local_shipping' },
        fields: [
            {
                field: 'status', type: 'string', meta: {
                    interface: 'select-dropdown', options: {
                        choices: [
                            { text: 'Nova Oferta', value: 'new' },
                            { text: 'Verificação Necessária', value: 'needs_attention' },
                            { text: 'Enviada', value: 'sent' },
                            { text: 'Aguardando Confirmação', value: 'waiting_confirmation' },
                            { text: 'Confirmado', value: 'confirmed' },
                            { text: 'Em Trânsito', value: 'in_transit' },
                            { text: 'Entregue', value: 'delivered' },
                            { text: 'Cancelado', value: 'cancelled' }
                        ]
                    }
                }
            },
            { field: 'origin', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'destination', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'cargo_type', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'total_value', type: 'decimal', meta: { interface: 'input', width: 'half' } },
            { field: 'pickup_date', type: 'timestamp', meta: { interface: 'datetime', width: 'half' } },
            { field: 'delivery_window_start', type: 'timestamp', meta: { interface: 'datetime', width: 'half' } },
            { field: 'delivery_window_end', type: 'timestamp', meta: { interface: 'datetime', width: 'half' } },
            { field: 'actual_arrival_time', type: 'timestamp', meta: { interface: 'datetime', width: 'half' } },
            { field: 'rejected_drivers_count', type: 'integer', meta: { interface: 'input', width: 'half' } },
            { field: 'email_content', type: 'text', meta: { interface: 'input-multiline', width: 'full' } },
            { field: 'needs_manual_review', type: 'boolean', meta: { interface: 'boolean', width: 'half' } },
            // Driver relationship will be added in relations step
            { field: 'driver_id', type: 'integer', meta: { interface: 'select-dropdown-m2o', width: 'half' } }
        ]
    },
    {
        collection: 'vehicle_matches',
        meta: { note: 'Scores de compatibilidade entre motoristas e embarques', icon: 'fact_check' },
        fields: [
            { field: 'compatibility_score', type: 'decimal', meta: { interface: 'input', width: 'half' } },
            {
                field: 'compatibility_level', type: 'string', meta: {
                    interface: 'select-dropdown', options: {
                        choices: [
                            { text: 'Alta', value: 'high' },
                            { text: 'Média', value: 'medium' },
                            { text: 'Baixa', value: 'low' }
                        ]
                    }
                }
            },
            { field: 'factors', type: 'json', meta: { interface: 'input-json', width: 'full' } },
            {
                field: 'status', type: 'string', meta: {
                    interface: 'select-dropdown', options: {
                        choices: [
                            { text: 'Sugerido', value: 'suggested' },
                            { text: 'Ofertado', value: 'offered' },
                            { text: 'Aceito', value: 'accepted' },
                            { text: 'Rejeitado', value: 'rejected' }
                        ]
                    }
                }
            },
            { field: 'embarque_id', type: 'integer', meta: { interface: 'select-dropdown-m2o', width: 'half' } },
            { field: 'driver_id', type: 'integer', meta: { interface: 'select-dropdown-m2o', width: 'half' } }
        ]
    },
    {
        collection: 'driver_field_config',
        meta: { note: 'Configuração de visibilidade de campos no frontend', icon: 'settings' },
        fields: [
            { field: 'field_name', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'label', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'visible', type: 'boolean', meta: { interface: 'boolean', width: 'half' } }
        ]
    }
];

const RELATIONS = [
    // Embarques -> Driver
    {
        collection: 'embarques',
        field: 'driver_id',
        related_collection: 'cadastro_motorista',
        schema: { on_delete: 'SET NULL' }
    },
    // Matches -> Embarques
    {
        collection: 'vehicle_matches',
        field: 'embarque_id',
        related_collection: 'embarques',
        schema: { on_delete: 'CASCADE' }
    },
    // Matches -> Drivers
    {
        collection: 'vehicle_matches',
        field: 'driver_id',
        related_collection: 'cadastro_motorista',
        schema: { on_delete: 'CASCADE' }
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
                        console.error(`Error ${res.statusCode} on ${path}:`, JSON.stringify(json, null, 2));
                        // Don't reject, just resolve null so script continues
                        resolve(null);
                    }
                } catch (e) {
                    console.error("Invalid JSON:", data);
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
    console.log("Starting Schema Creation...");

    // 1. Create Collections
    for (const col of COLLECTIONS) {
        console.log(`Creating collection [${col.collection}]...`);
        // Create collection wrapper
        await request('POST', '/collections', {
            collection: col.collection,
            meta: col.meta,
            schema: {} // Allow Directus to create ID default
        });

        // Create Fields
        for (const field of col.fields) {
            console.log(`  -> Adding field [${field.field}]`);
            await request('POST', '/fields/' + col.collection, field);
            await sleep(200); // Rate limit safety
        }
    }

    // 2. Create Relations
    console.log("Creating Relationships...");
    for (const rel of RELATIONS) {
        console.log(`  -> Linking [${rel.collection}.${rel.field}] to [${rel.related_collection}]`);
        await request('POST', '/relations', rel);
        await sleep(200);
    }

    console.log("DTO Schema Setup Complete.");
}

run();
