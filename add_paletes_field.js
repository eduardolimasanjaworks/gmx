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

async function addPaletesField() {
    const field = {
        field: 'paletes',
        type: 'string', // using string for flexibility or integer? If the user imports from CSV, it's often parsed as string or number. Let's use string.
        meta: {
            interface: 'input',
            special: null,
            required: false,
            note: 'Quantidade de paletes'
        },
        schema: {
            name: 'paletes',
            is_nullable: true
        }
    };

    console.log(`Adding field ${field.field}...`);
    const ok = await api('POST', '/fields/follow', field);
    if (ok) {
        console.log(`Added ${field.field} successfully.`);
    } else {
        console.log(`Failed to add ${field.field} (might already exist).`);
    }
    console.log("Done.");
}

addPaletesField();
