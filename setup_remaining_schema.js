
import http from 'http';

const CONFIG = {
    hostname: '91.99.137.101',
    port: 8057,
    token: 'HM5fQ_PdQKtU95SStnyosF7RY_gnRuYo'
};

const COLLECTIONS = [
    {
        collection: 'app_roles',
        meta: { note: 'Gestão de cargos/funções do sistema', icon: 'badge' },
        fields: [
            { field: 'name', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'description', type: 'text', meta: { interface: 'input-multiline', width: 'full' } },
            { field: 'permissions', type: 'json', meta: { interface: 'input-json', width: 'full' } }, // Stores JSON array of permission strings
            { field: 'color', type: 'string', meta: { interface: 'color', width: 'half' } }
        ]
    },
    {
        collection: 'app_users',
        meta: { note: 'Usuários do sistema', icon: 'people' },
        fields: [
            { field: 'email', type: 'string', meta: { interface: 'input-email', width: 'half', special: ['unique'] } },
            { field: 'display_name', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'role_id', type: 'integer', meta: { interface: 'select-dropdown-m2o', width: 'half' } },
            { field: 'password_hash', type: 'string', meta: { interface: 'input-hash', width: 'half', hidden: true } },
            { field: 'active', type: 'boolean', meta: { interface: 'boolean', width: 'half' }, schema: { default_value: true } }
        ]
    },
    {
        collection: 'operational_alerts',
        meta: { note: 'Alertas operacionais do sistema', icon: 'warning' },
        fields: [
            { field: 'title', type: 'string', meta: { interface: 'input', width: 'full' } },
            { field: 'description', type: 'text', meta: { interface: 'input-multiline', width: 'full' } },
            {
                field: 'severity', type: 'string', meta: {
                    interface: 'select-dropdown', options: {
                        choices: [
                            { text: 'Critical', value: 'critical' },
                            { text: 'High', value: 'high' },
                            { text: 'Medium', value: 'medium' },
                            { text: 'Low', value: 'low' }
                        ]
                    }
                }
            },
            { field: 'alert_type', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'entity_type', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'entity_id', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'action_required', type: 'string', meta: { interface: 'input', width: 'full' } },
            { field: 'is_resolved', type: 'boolean', meta: { interface: 'boolean', width: 'half' } },
            { field: 'resolved_at', type: 'timestamp', meta: { interface: 'datetime', width: 'half' } },
            { field: 'resolved_by', type: 'string', meta: { interface: 'input', width: 'half' } }
        ]
    },
    {
        collection: 'driver_field_config',
        meta: { note: 'Configuração de campos visíveis do motorista', icon: 'settings_input_component' },
        fields: [
            { field: 'field_name', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'display_name', type: 'string', meta: { interface: 'input', width: 'half' } },
            { field: 'visible_in_card', type: 'boolean', meta: { interface: 'boolean', width: 'half' } },
            { field: 'visible_in_table', type: 'boolean', meta: { interface: 'boolean', width: 'half' } },
            { field: 'display_order', type: 'integer', meta: { interface: 'input', width: 'half' } },
            {
                field: 'field_type', type: 'string', meta: {
                    interface: 'select-dropdown', options: {
                        choices: [
                            { text: 'Text', value: 'text' },
                            { text: 'Select', value: 'select' },
                            { text: 'Number', value: 'number' }
                        ]
                    }
                }
            }
        ]
    }
];

const RELATIONS = [
    {
        collection: 'app_users',
        field: 'role_id',
        related_collection: 'app_roles',
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
                    resolve(json);
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
    console.log("Starting Remaining Schema Creation...");

    for (const col of COLLECTIONS) {
        console.log(`Creating/Updating collection [${col.collection}]...`);
        // Try create collection
        await request('POST', '/collections', {
            collection: col.collection,
            meta: col.meta,
            schema: {}
        });

        // Create fields
        for (const field of col.fields) {
            process.stdout.write('.');
            await request('POST', '/fields/' + col.collection, field);
            await sleep(50);
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
