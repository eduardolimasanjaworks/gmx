
/**
 * Criar permissões explícitas para o role Administrator
 * já que não podemos habilitar admin_access via API
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const ADMIN_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

const COLLECTIONS = [
    'delivery_receipts',
    'payment_receipts',
    'shipment_documents',
    'directus_files'
];

const ACTIONS = ['read', 'create', 'update', 'delete'];

async function criarPermissoesExplicitas() {
    try {
        console.log('🔧 Criando permissões explícitas para role Administrator...\n');

        // Obter ou criar policy (OBRIGATÓRIA)
        const policiesRes = await fetch(`${DIRECTUS_URL}/policies`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const policiesData = await policiesRes.json();
        let policy = policiesData.data?.find(p => p.id === '7fb88d53-685e-41d6-87ef-5f22cc3ff5d8');
        
        if (!policy) {
            // Criar nova policy
            console.log('📝 Criando nova policy...');
            const createPolicyRes = await fetch(`${DIRECTUS_URL}/policies`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'Admin Full Access Policy',
                    description: 'Full access policy for Administrator role',
                    collection: '*',
                    action: '*',
                    permissions: {},
                    validation: {},
                    presets: {},
                    fields: ['*']
                })
            });
            const createPolicyData = await createPolicyRes.json();
            if (createPolicyData.errors) {
                console.error('❌ Erro ao criar policy:', createPolicyData.errors);
                console.error('❌ Não é possível criar permissões sem uma policy!');
                return;
            } else {
                policy = createPolicyData.data;
                console.log(`✅ Policy criada: ${policy.id}\n`);
            }
        } else {
            console.log(`✅ Usando policy existente: ${policy.id}\n`);
        }

        const policyRef = { id: policy.id };

        // Criar permissões para cada collection
        for (const collection of COLLECTIONS) {
            console.log(`📦 Processando ${collection}...`);
            
            for (const action of ACTIONS) {
                // Verificar se já existe
                const checkRes = await fetch(
                    `${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}&filter[action][_eq]=${action}&filter[role][_eq]=${ADMIN_ROLE_ID}`,
                    {
                        headers: { 'Authorization': `Bearer ${TOKEN}` }
                    }
                );
                const checkData = await checkRes.json();

                if (checkData.data && checkData.data.length > 0) {
                    // Atualizar existente
                    const permId = checkData.data[0].id;
                    const updateBody = {
                        fields: ['*'],
                        permissions: {},
                        validation: {},
                        policy: policyRef
                    };
                    
                    const updateRes = await fetch(`${DIRECTUS_URL}/permissions/${permId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updateBody)
                    });
                    
                    if (updateRes.ok) {
                        console.log(`   ✅ Atualizada: ${action}`);
                    } else {
                        const errorData = await updateRes.json();
                        console.log(`   ⚠️ Erro ao atualizar ${action}:`, errorData.errors?.[0]?.message || 'Desconhecido');
                    }
                } else {
                    // Criar nova
                    const createBody = {
                        role: ADMIN_ROLE_ID,
                        collection: collection,
                        action: action,
                        fields: ['*'],
                        permissions: {},
                        validation: {},
                        policy: policyRef
                    };
                    
                    const createRes = await fetch(`${DIRECTUS_URL}/permissions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(createBody)
                    });

                    const createData = await createRes.json();
                    if (createData.errors) {
                        console.log(`   ❌ Erro ao criar ${action}:`, createData.errors[0]?.message || 'Desconhecido');
                        console.log(`      Detalhes:`, JSON.stringify(createData.errors, null, 2));
                    } else if (createData.data) {
                        console.log(`   ✨ Criada: ${action} (ID: ${createData.data.id})`);
                    } else {
                        console.log(`   ⚠️ Resposta inesperada:`, JSON.stringify(createData, null, 2));
                    }
                }
            }
            console.log('');
        }

        // Verificar resultado final
        console.log('\n🧪 Verificando permissões criadas...\n');
        
        for (const collection of COLLECTIONS) {
            const verifyRes = await fetch(
                `${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}&filter[role][_eq]=${ADMIN_ROLE_ID}`,
                {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                }
            );
            const verifyData = await verifyRes.json();
            
            if (verifyData.data && verifyData.data.length > 0) {
                console.log(`✅ ${collection}: ${verifyData.data.length} permissão(ões)`);
            } else {
                console.log(`❌ ${collection}: Nenhuma permissão encontrada`);
            }
        }

        console.log('\n✅ Processo concluído!');
        console.log('\n💡 IMPORTANTE:');
        console.log('   1. Faça logout e login novamente no aplicativo');
        console.log('   2. Isso atualizará o token com as novas permissões');
        console.log('   3. Se ainda houver erros 403, verifique se o token foi atualizado');

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    }
}

criarPermissoesExplicitas();
