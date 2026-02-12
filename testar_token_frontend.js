
/**
 * Script para testar se o problema é com o token do frontend
 * Execute este script e depois copie o token do localStorage do navegador
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';

// INSTRUÇÕES:
// 1. Abra o navegador no aplicativo
// 2. Abra o Console do Desenvolvedor (F12)
// 3. Execute: localStorage.getItem('directus_token')
// 4. Copie o token e cole aqui abaixo
const TOKEN_FRONTEND = 'COLE_O_TOKEN_AQUI';

const COLLECTIONS = [
    'delivery_receipts',
    'payment_receipts',
    'shipment_documents',
    'directus_files'
];

async function testarTokenFrontend() {
    if (TOKEN_FRONTEND === 'COLE_O_TOKEN_AQUI') {
        console.log('⚠️ Por favor, cole o token do frontend na variável TOKEN_FRONTEND');
        console.log('\n📋 Como obter o token:');
        console.log('1. Abra o navegador no aplicativo (http://localhost:5173)');
        console.log('2. Abra o Console do Desenvolvedor (F12)');
        console.log('3. Execute: localStorage.getItem("directus_token")');
        console.log('4. Copie o token e cole na linha 11 deste arquivo');
        return;
    }

    try {
        console.log('🧪 Testando token do frontend...\n');

        // 1. Verificar usuário
        const meRes = await fetch(`${DIRECTUS_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${TOKEN_FRONTEND}` }
        });
        const meData = await meRes.json();
        
        if (!meData.data) {
            console.error('❌ Token inválido ou expirado');
            console.error('Erro:', meData.errors?.[0]?.message || 'Desconhecido');
            return;
        }

        const user = meData.data;
        console.log('👤 Usuário autenticado:');
        console.log(`   Nome: ${user.first_name} ${user.last_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role ID: ${user.role}`);
        console.log('');

        // 2. Buscar informações do role
        if (user.role) {
            const roleRes = await fetch(`${DIRECTUS_URL}/roles/${user.role}`, {
                headers: { 'Authorization': `Bearer ${TOKEN_FRONTEND}` }
            });
            const roleData = await roleRes.json();
            if (roleData.data) {
                console.log('📋 Role:');
                console.log(`   Nome: ${roleData.data.name}`);
                console.log(`   ID: ${roleData.data.id}`);
                console.log(`   Admin Access: ${roleData.data.admin_access || false}`);
                console.log('');
            }
        }

        // 3. Testar acesso às collections
        console.log('🧪 Testando acesso às collections:\n');
        
        for (const collection of COLLECTIONS) {
            try {
                const testRes = await fetch(`${DIRECTUS_URL}/items/${collection}?limit=1`, {
                    headers: { 'Authorization': `Bearer ${TOKEN_FRONTEND}` }
                });
                
                if (testRes.ok) {
                    console.log(`✅ ${collection}: Acesso permitido (${testRes.status})`);
                } else {
                    const errorData = await testRes.json();
                    console.log(`❌ ${collection}: ${testRes.status} - ${errorData.errors?.[0]?.message || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.log(`❌ ${collection}: Erro - ${error.message}`);
            }
        }

        // 4. Testar upload de arquivo
        console.log('\n🧪 Testando acesso a directus_files (upload)...\n');
        try {
            const filesRes = await fetch(`${DIRECTUS_URL}/files?limit=1`, {
                headers: { 'Authorization': `Bearer ${TOKEN_FRONTEND}` }
            });
            
            if (filesRes.ok) {
                console.log(`✅ directus_files (GET): Acesso permitido`);
            } else {
                const errorData = await filesRes.json();
                console.log(`❌ directus_files (GET): ${filesRes.status} - ${errorData.errors?.[0]?.message || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.log(`❌ directus_files (GET): Erro - ${error.message}`);
        }

        console.log('\n✅ Teste concluído!');

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    }
}

testarTokenFrontend();
