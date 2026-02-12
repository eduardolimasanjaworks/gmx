
/**
 * Script para verificar permissões do usuário atual e das collections de documentos
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

const COLLECTIONS = [
    'delivery_receipts',
    'payment_receipts',
    'shipment_documents',
    'directus_files'
];

async function verificarPermissoes() {
    try {
        console.log('🔍 Verificando permissões do usuário atual...\n');

        // 1. Obter informações do usuário
        const meRes = await fetch(`${DIRECTUS_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const meData = await meRes.json();
        
        if (!meData.data) {
            console.error('❌ Não foi possível obter dados do usuário');
            return;
        }

        const user = meData.data;
        console.log('👤 Usuário atual:');
        console.log(`   Nome: ${user.first_name} ${user.last_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role ID: ${user.role}`);
        console.log(`   Role Name: ${user.role?.name || 'N/A'}\n`);

        // 2. Buscar informações do role
        if (user.role) {
            const roleRes = await fetch(`${DIRECTUS_URL}/roles/${user.role}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const roleData = await roleRes.json();
            if (roleData.data) {
                console.log('📋 Informações do Role:');
                console.log(`   Nome: ${roleData.data.name}`);
                console.log(`   ID: ${roleData.data.id}\n`);
            }
        }

        // 3. Verificar permissões para cada collection
        console.log('🔐 Verificando permissões por collection:\n');
        
        for (const collection of COLLECTIONS) {
            console.log(`📦 ${collection}:`);
            console.log('─'.repeat(50));
            
            // Verificar permissões públicas
            const publicPermsRes = await fetch(`${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}&filter[role][_null]=true`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const publicPermsData = await publicPermsRes.json();
            
            if (publicPermsData.data && publicPermsData.data.length > 0) {
                console.log(`   ✅ Permissões PÚBLICAS encontradas: ${publicPermsData.data.length}`);
                publicPermsData.data.forEach(p => {
                    console.log(`      - ${p.action} (Policy: ${p.policy})`);
                });
            } else {
                console.log(`   ❌ Nenhuma permissão PÚBLICA encontrada`);
            }

            // Verificar permissões do role do usuário
            if (user.role) {
                const rolePermsRes = await fetch(`${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}&filter[role][_eq]=${user.role}`, {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                const rolePermsData = await rolePermsRes.json();
                
                if (rolePermsData.data && rolePermsData.data.length > 0) {
                    console.log(`   ✅ Permissões do ROLE encontradas: ${rolePermsData.data.length}`);
                    rolePermsData.data.forEach(p => {
                        console.log(`      - ${p.action} (Policy: ${p.policy})`);
                    });
                } else {
                    console.log(`   ❌ Nenhuma permissão do ROLE encontrada`);
                }
            }

            // Verificar todas as permissões (para debug)
            const allPermsRes = await fetch(`${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const allPermsData = await allPermsRes.json();
            console.log(`   📊 Total de permissões para ${collection}: ${allPermsData.data?.length || 0}`);
            
            console.log('');
        }

        // 4. Testar acesso direto
        console.log('🧪 Testando acesso direto às collections...\n');
        
        for (const collection of COLLECTIONS) {
            try {
                const testRes = await fetch(`${DIRECTUS_URL}/items/${collection}?limit=1`, {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                });
                
                if (testRes.ok) {
                    console.log(`   ✅ ${collection}: Acesso permitido (${testRes.status})`);
                } else {
                    const errorData = await testRes.json();
                    console.log(`   ❌ ${collection}: Acesso negado (${testRes.status})`);
                    console.log(`      Erro: ${errorData.errors?.[0]?.message || 'Desconhecido'}`);
                }
            } catch (error) {
                console.log(`   ❌ ${collection}: Erro ao testar - ${error.message}`);
            }
        }

        console.log('\n✅ Verificação concluída!');

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    }
}

verificarPermissoes();
