const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function api(method, path, body) {
    const res = await fetch(`${URL}${path}`, {
        method,
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) {
        console.error(`Error ${method} ${path}:`, data);
        return false;
    }
    return true;
}

async function addFields() {
    const fields = [
        {
            field: 'data_pedido',
            type: 'date',
            meta: {
                interface: 'datetime',
                display: 'datetime',
                special: null,
                required: false,
                note: 'Data do pedido',
                display_options: {
                    format: 'long'
                }
            },
            schema: {
                name: 'data_pedido',
                is_nullable: true
            }
        },
        {
            field: 'data_carregado',
            type: 'date',
            meta: {
                interface: 'datetime',
                display: 'datetime',
                special: null,
                required: false,
                note: 'Data de carregamento',
                display_options: {
                    format: 'long'
                }
            },
            schema: {
                name: 'data_carregado',
                is_nullable: true
            }
        }
    ];

    for (const field of fields) {
        console.log(`Adding field ${field.field}...`);
        const ok = await api('POST', '/fields/follow', field);
        if (ok) {
            console.log(`Added ${field.field} successfully.`);
        } else {
            console.log(`Failed to add ${field.field} (might already exist).`);
        }
    }
    console.log("Done.");
}

addFields();
