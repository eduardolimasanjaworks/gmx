// Directus v11 usa 'access' ao invés de 'permissions' com campo 'policy'
// Vamos verificar os endpoints disponíveis
const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function api(method, path, body) {
    const res = await fetch(`${URL}${path}`, {
        method,
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) console.error(`Error ${method} ${path}:`, JSON.stringify(data.errors?.[0]?.message || data, null, 2));
    return data;
}

async function main() {
    // Listar policies existentes (Directus v11)
    const policies = await api('GET', '/policies?limit=10&fields=id,name,admin_access');
    console.log('Policies:', JSON.stringify(policies.data?.map(p => `${p.name} (${p.id})`), null, 2));

    // Listar permissões já existentes na follow
    const perms = await api('GET', '/permissions?filter[collection][_eq]=follow&limit=20');
    console.log('Follow permissions:', JSON.stringify(perms.data, null, 2));
}

main().catch(console.error);
