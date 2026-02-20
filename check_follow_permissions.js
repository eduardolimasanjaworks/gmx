// Verifica papeis existentes e permissões da collection 'embarques' para replicar em 'follow'
const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function api(method, path, body) {
    const res = await fetch(`${URL}${path}`, {
        method,
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) console.error('Error:', JSON.stringify(data.errors || data, null, 2));
    return data;
}

async function fixPermissions() {
    // 1. Ver roles existentes
    const roles = await api('GET', '/roles?fields=id,name');
    console.log('Roles:', roles.data?.map(r => `${r.name} (${r.id})`));

    // 2. Ver permissões atuais da collection embarques (para copiar o padrão)
    const embarquesPerms = await api('GET', '/permissions?filter[collection][_eq]=embarques&fields=role,action,fields,permissions,validation');
    console.log('\nEmbarques permissions:', JSON.stringify(embarquesPerms.data, null, 2));

    // 3. Ver permissões atuais de follow se já existem
    const followPerms = await api('GET', '/permissions?filter[collection][_eq]=follow&fields=id,role,action');
    console.log('\nFollow permissions already:', JSON.stringify(followPerms.data, null, 2));
}

fixPermissions().catch(console.error);
