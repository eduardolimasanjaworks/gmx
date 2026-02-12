
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

async function setupDocumentsPermissions() {
    try {
        console.log('🔄 Configurando permissões para collections de documentos...\n');

        // Collections que precisam de permissões
        const collections = [
            'delivery_receipts',
            'payment_receipts',
            'shipment_documents'
        ];

        // Ações necessárias
        const actions = ['read', 'create', 'update', 'delete'];

        // Buscar policies (este Directus está no modelo baseado em Policies)
        const getAllPolicies = async () => {
            const policiesRes = await fetch(`${DIRECTUS_URL}/policies?limit=200`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const policiesData = await policiesRes.json();
            return policiesData.data || [];
        };

        // Helper para verificar e criar permissão
        const ensurePermission = async (collection, action, policyId) => {
            try {
                if (!policyId) {
                    console.error(`   ❌ Policy ID não fornecido para ${collection} (${action})`);
                    return;
                }

                // No modelo baseado em Policies, o vínculo é por `policy` (role pode não ser gravado/retornado)
                const url =
                    `${DIRECTUS_URL}/permissions` +
                    `?filter[collection][_eq]=${collection}` +
                    `&filter[action][_eq]=${action}` +
                    `&filter[policy][_eq]=${policyId}`;

                const checkRes = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                const checkData = await checkRes.json();

                if (checkData.data && checkData.data.length > 0) {
                    const permId = checkData.data[0].id;
                    // Atualizar para garantir que fields seja '*'
                    await fetch(`${DIRECTUS_URL}/permissions/${permId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ fields: ['*'] })
                    });
                    console.log(`   ✅ Permissão já existe e foi atualizada: ${collection} (${action}) (policy ${policyId})`);
                } else {
                    // Criar nova permissão
                    const createRes = await fetch(`${DIRECTUS_URL}/permissions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            collection: collection,
                            action: action,
                            fields: ['*'],
                            permissions: {}, // Sem restrições
                            validation: {}, // Sem validações
                            policy: policyId // ID da policy
                        })
                    });

                    const createData = await createRes.json();
                    if (createData.errors) {
                        console.error(`   ❌ Erro ao criar permissão ${collection} (${action}):`, createData.errors);
                    } else {
                        console.log(`   ✨ Permissão criada: ${collection} (${action}) (policy ${policyId})`);
                    }
                }
            } catch (error) {
                console.error(`   ❌ Erro ao processar permissão ${collection} (${action}):`, error.message);
            }
        };

        // 1) Buscar todas as policies e aplicar permissões nelas (tudo público / sem briga de permissão)
        console.log('1️⃣ Buscando policies...');
        const policies = await getAllPolicies();
        if (!policies.length) {
            console.error('❌ Nenhuma policy encontrada. Verifique o Directus.');
            return;
        }
        console.log(`   ✅ Policies encontradas: ${policies.length}\n`);

        // 2) Configurar permissões para TODAS as policies (inclui Administrator e Public)
        console.log('2️⃣ Configurando permissões em TODAS as policies (modo público)...');
        for (const policy of policies) {
            if (!policy?.id) continue;
            console.log(`\n   🧩 Policy: ${policy.name || '(sem nome)'} (ID: ${policy.id})`);
            for (const collection of collections) {
                for (const action of actions) {
                    await ensurePermission(collection, action, policy.id);
                }
            }
        }

        console.log('\n✅ Configuração de permissões concluída!');
        console.log('\n📝 Nota sobre o erro 503 (Service Unavailable):');
        console.log('   Este erro geralmente indica que o serviço de arquivos do Directus não está configurado corretamente.');
        console.log('   Verifique:');
        console.log('   1. Se o storage está configurado no Directus (Settings > File Storage)');
        console.log('   2. Se o diretório de uploads existe e tem permissões de escrita');
        console.log('   3. Se o Directus está rodando corretamente no servidor');

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    }
}

setupDocumentsPermissions();
