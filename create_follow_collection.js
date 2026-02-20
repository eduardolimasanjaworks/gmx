// Script para criar a collection 'follow' no Directus com os campos corretos
const URL = 'http://91.99.137.101:8057';
const TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

async function api(method, path, body) {
    const res = await fetch(`${URL}${path}`, {
        method,
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) {
        console.error('API Error:', JSON.stringify(data.errors || data, null, 2));
        return null;
    }
    return data;
}

async function createFollowCollection() {
    // 1. Criar a collection
    console.log('Criando collection follow...');
    const col = await api('POST', '/collections', {
        collection: 'follow',
        meta: {
            collection: 'follow',
            icon: 'package',
            note: 'Acompanhamento de Cargas (Follow)',
            display_template: '{{pedido}} - {{origem}} -> {{destino}}',
            sort_field: 'sort'
        },
        schema: { name: 'follow', comment: null }
    });
    if (!col) { console.log('Pode já existir ou houve erro. Continuando...'); }

    // 2. Criar os campos
    const fields = [
        { field: 'pedido', type: 'string', meta: { interface: 'input', display_options: null, required: false } },
        { field: 'origem', type: 'text', meta: { interface: 'input', required: false } },
        { field: 'destino', type: 'text', meta: { interface: 'input', required: false } },
        { field: 'uf', type: 'string', meta: { interface: 'input', required: false } },
        { field: 'cliente', type: 'string', meta: { interface: 'input', required: false } },
        { field: 'tp', type: 'string', meta: { interface: 'input', note: 'Transportadora', required: false } },
        { field: 'produto', type: 'string', meta: { interface: 'input', required: false } },
        {
            field: 'status', type: 'string', meta: {
                interface: 'select-dropdown', options: {
                    choices: [
                        { text: 'Novo', value: 'novo' },
                        { text: 'Em Trânsito', value: 'em_transito' },
                        { text: 'Entregue', value: 'entregue' },
                        { text: 'Com Problema', value: 'problema' }
                    ]
                }, default_value: 'novo', required: false
            }
        }
    ];

    console.log('Criando campos...');
    for (const field of fields) {
        const result = await api('POST', `/fields/follow`, field);
        if (result) {
            console.log(`✅ Campo criado: ${field.field}`);
        } else {
            console.log(`⚠️  Campo já existe ou erro: ${field.field}`);
        }
    }

    // 3. Verificar campos criados
    const check = await api('GET', '/fields/follow');
    if (check) {
        console.log('\nCampos na collection follow:');
        check.data.forEach(f => console.log(`  - ${f.field} (${f.type})`));
    }

    console.log('\n✅ Collection follow pronta!');
}

createFollowCollection().catch(console.error);
