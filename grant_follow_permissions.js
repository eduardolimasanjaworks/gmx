// Concede permissões completas na collection 'follow' para todos os roles
const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function api(method, path, body) {
    const res = await fetch(`${URL}${path}`, {
        method,
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) console.error(`Error on ${method} ${path}:`, JSON.stringify(data.errors || data, null, 2));
    return data;
}

async function grantPermissions() {
    // Busca roles (exceto admin)
    const rolesResp = await api('GET', '/roles?limit=-1&fields=id,name,admin_access');
    const roles = rolesResp.data || [];
    console.log('Roles found:', roles.map(r => `${r.name} (admin:${r.admin_access})`));

    const actions = ['read', 'create', 'update', 'delete'];

    for (const role of roles) {
        if (role.admin_access) {
            console.log(`Skipping admin role: ${role.name}`);
            continue;
        }
        for (const action of actions) {
            const result = await api('POST', '/permissions', {
                collection: 'follow',
                action: action,
                role: role.id,
                fields: ['*'],
                permissions: {},
                validation: {}
            });
            if (result.data) {
                console.log(`✅ ${action} granted for role: ${role.name}`);
            }
        }
    }

    // Também concede para role null (public / sem autenticação)
    for (const action of ['read', 'create', 'update']) {
        const result = await api('POST', '/permissions', {
            collection: 'follow',
            action: action,
            role: null, // public
            fields: ['*'],
            permissions: {},
            validation: {}
        });
        if (result.data) {
            console.log(`✅ ${action} granted for PUBLIC`);
        }
    }

    console.log('\n✅ Permissões configuradas!');
}

grantPermissions().catch(console.error);
