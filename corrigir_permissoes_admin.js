
/**
 * Script para criar permissões específicas para o role Administrator
 * e limpar duplicatas
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

const COLLECTIONS = [
    'delivery_receipts',
    'payment_receipts',
    'shipment_documents',
    'directus_files'
];

const ACTIONS = ['read', 'create', 'update', 'delete'];
const ADMIN_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

async function corrigirPermissoesAdmin() {
    try {
        console.log('🔧 Corrigindo permissões para role Administrator...\n');

        // 1. Obter a policy
        const policiesRes = await fetch(`${DIRECTUS_URL}/policies`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const policiesData = await policiesRes.json();
        let publicPolicy = policiesData.data?.find(p => p.id === '7fb88d53-685e-41d6-87ef-5f22cc3ff5d8');
        
        if (!publicPolicy) {
            console.log('⚠️ Policy não encontrada, criando nova...');
            const createPolicyRes = await fetch(`${DIRECTUS_URL}/policies`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'Admin Motorista Policy',
                    description: 'Policy for admin access to motorista-related data',
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
                return;
            }
            publicPolicy = createPolicyData.data;
        }

        const policyId = publicPolicy.id;
        console.log(`✅ Usando policy: ${publicPolicy.name} (${policyId})\n`);

        // 2. Para cada collection, criar permissões para o role Administrator
        for (const collection of COLLECTIONS) {
            console.log(`📦 Processando ${collection}...`);
            
            for (const action of ACTIONS) {
                // Verificar se já existe permissão para este role
                const checkRes = await fetch(
                    `${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}&filter[action][_eq]=${action}&filter[role][_eq]=${ADMIN_ROLE_ID}`,
                    {
                        headers: { 'Authorization': `Bearer ${TOKEN}` }
                    }
                );
                const checkData = await checkRes.json();

                if (checkData.data && checkData.data.length > 0) {
                    // Atualizar permissão existente
                    const permId = checkData.data[0].id;
                    const updateRes = await fetch(`${DIRECTUS_URL}/permissions/${permId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            fields: ['*'],
                            policy: { id: policyId },
                            permissions: {},
                            validation: {}
                        })
                    });
                    
                    if (updateRes.ok) {
                        console.log(`   ✅ Atualizada: ${action}`);
                    } else {
                        const errorData = await updateRes.json();
                        console.log(`   ⚠️ Erro ao atualizar ${action}:`, errorData.errors?.[0]?.message);
                    }
                } else {
                    // Criar nova permissão
                    const createRes = await fetch(`${DIRECTUS_URL}/permissions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            role: ADMIN_ROLE_ID,
                            collection: collection,
                            action: action,
                            fields: ['*'],
                            permissions: {},
                            validation: {},
                            policy: { id: policyId }
                        })
                    });

                    const createData = await createRes.json();
                    if (createData.errors) {
                        console.log(`   ❌ Erro ao criar ${action}:`, createData.errors[0]?.message);
                    } else {
                        console.log(`   ✨ Criada: ${action}`);
                    }
                }
            }
            console.log('');
        }

        // 3. Verificar resultado
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
                console.log(`✅ ${collection}: ${verifyData.data.length} permissão(ões) para Administrator`);
                verifyData.data.forEach(p => {
                    console.log(`   - ${p.action}`);
                });
            } else {
                console.log(`❌ ${collection}: Nenhuma permissão encontrada`);
            }
        }

        // 4. Testar acesso
        console.log('\n🧪 Testando acesso com token...\n');
        
        for (const collection of COLLECTIONS) {
            try {
                const testRes = await fetch(`${DIRECTUS_URL}/items/${collection}?limit=1`, {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                
                if (testRes.ok) {
                    console.log(`✅ ${collection}: Acesso permitido`);
                } else {
                    const errorData = await testRes.json();
                    console.log(`❌ ${collection}: ${testRes.status} - ${errorData.errors?.[0]?.message || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.log(`❌ ${collection}: Erro - ${error.message}`);
            }
        }

        console.log('\n✅ Correção concluída!');
        console.log('\n💡 IMPORTANTE: O erro 403 no frontend pode persistir se o token do usuário no navegador for diferente.');
        console.log('   Faça logout e login novamente no aplicativo para atualizar o token.');

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    }
}

corrigirPermissoesAdmin();
