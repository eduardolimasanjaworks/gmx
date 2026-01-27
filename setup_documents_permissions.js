
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

async function setupDocumentsPermissions() {
    try {
        console.log('🔄 Configurando permissões para collections de documentos...\n');

        // Collections que precisam de permissões
        const collections = [
            'delivery_receipts',
            'payment_receipts',
            'shipment_documents',
            'directus_files' // Necessário para upload de arquivos
        ];

        // Ações necessárias
        const actions = ['read', 'create', 'update', 'delete'];

        // Helper para verificar e criar permissão
        const ensurePermission = async (collection, action, roleId = null) => {
            try {
                // Verificar se a permissão já existe
                let url = `${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}&filter[action][_eq]=${action}`;
                if (roleId) {
                    url += `&filter[role][_eq]=${roleId}`;
                } else {
                    url += `&filter[role][_null]=true`;
                }

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
                    console.log(`   ✅ Permissão já existe e foi atualizada: ${collection} (${action}) para role ${roleId || 'Public'}`);
                } else {
                    // Criar nova permissão
                    const createRes = await fetch(`${DIRECTUS_URL}/permissions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            role: roleId,
                            collection: collection,
                            action: action,
                            fields: ['*'],
                            permissions: {}, // Sem restrições
                            validation: {} // Sem validações
                        })
                    });

                    const createData = await createRes.json();
                    if (createData.errors) {
                        console.error(`   ❌ Erro ao criar permissão ${collection} (${action}):`, createData.errors);
                    } else {
                        console.log(`   ✨ Permissão criada: ${collection} (${action}) para role ${roleId || 'Public'}`);
                    }
                }
            } catch (error) {
                console.error(`   ❌ Erro ao processar permissão ${collection} (${action}):`, error.message);
            }
        };

        // 1. Obter o role do usuário autenticado
        console.log('1️⃣ Verificando usuário autenticado...');
        const meRes = await fetch(`${DIRECTUS_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const meData = await meRes.json();
        let tokenRole = null;
        if (meData.data) {
            tokenRole = meData.data.role;
            console.log(`   Usuário: ${meData.data.first_name} ${meData.data.last_name} (${meData.data.email})`);
            console.log(`   Role ID: ${tokenRole}\n`);
        }

        // 2. Configurar permissões para Public (null)
        console.log('2️⃣ Configurando permissões PÚBLICAS (role: null)...');
        for (const collection of collections) {
            for (const action of actions) {
                await ensurePermission(collection, action, null);
            }
        }

        // 3. Configurar permissões para o role do usuário autenticado
        if (tokenRole) {
            console.log(`\n3️⃣ Configurando permissões para o role do usuário (ID: ${tokenRole})...`);
            for (const collection of collections) {
                for (const action of actions) {
                    await ensurePermission(collection, action, tokenRole);
                }
            }
        }

        // 4. Configurar permissões para todos os roles existentes
        console.log('\n4️⃣ Configurando permissões para TODOS os roles...');
        const rolesRes = await fetch(`${DIRECTUS_URL}/roles`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const rolesData = await rolesRes.json();
        
        if (rolesData.data) {
            for (const role of rolesData.data) {
                console.log(`   Processando role: ${role.name} (ID: ${role.id})...`);
                for (const collection of collections) {
                    for (const action of actions) {
                        await ensurePermission(collection, action, role.id);
                    }
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
