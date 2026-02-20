// Criar permissões para a coleção follow usando as policies existentes do Directus v11
const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function api(method, path, body) {
    const res = await fetch(`${URL}${path}`, {
        method,
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) console.error(`Error ${method} ${path}:`, JSON.stringify(data.errors?.[0]?.message || data));
    return data;
}

async function main() {
    // 1. Buscar todas as policies
    const policies = await api('GET', '/policies?limit=-1&fields=id,name,admin_access');
    console.log('Policies:', policies.data?.map(p => `${p.name} | ${p.id}`));

    const nonAdminPolicies = policies.data?.filter(p => !p.admin_access) || [];
    const actions = ['read', 'create', 'update', 'delete'];

    // 2. Criar permissões para cada policy não-admin + cada action
    for (const policy of nonAdminPolicies) {
        for (const action of actions) {
            const result = await api('POST', '/permissions', {
                collection: 'follow',
                action,
                policy: policy.id,
                fields: ['*'],
                permissions: {},
                validation: {}
            });
            if (result.data?.id) {
                console.log(`✅ ${action} -> policy: ${policy.name}`);
            } else {
                console.log(`⚠️  ${action} -> policy: ${policy.name}:`, result?.errors?.[0]?.message);
            }
        }
    }
    console.log('\nPronto!');
}

main().catch(console.error);
