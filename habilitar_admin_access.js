
/**
 * Habilitar admin_access para o role Administrator
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const ADMIN_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

async function habilitarAdminAccess() {
    try {
        console.log('🔧 Habilitando admin_access para role Administrator...\n');

        // Tentar atualizar via PATCH
        const updateRes = await fetch(`${DIRECTUS_URL}/roles/${ADMIN_ROLE_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                admin_access: true,
                app_access: true
            })
        });
        
        const updateData = await updateRes.json();
        
        if (updateData.errors) {
            console.error('❌ Erro ao atualizar role:', updateData.errors);
            console.log('\n💡 Tentando método alternativo...\n');
            
            // Tentar via PUT (algumas versões do Directus usam PUT)
            const putRes = await fetch(`${DIRECTUS_URL}/roles/${ADMIN_ROLE_ID}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: ADMIN_ROLE_ID,
                    admin_access: true,
                    app_access: true
                })
            });
            
            const putData = await putRes.json();
            if (putData.errors) {
                console.error('❌ Erro também com PUT:', putData.errors);
                console.log('\n💡 O role Administrator pode estar protegido.');
                console.log('   Tente habilitar manualmente no Directus Admin UI:');
                console.log('   Settings > Roles & Permissions > Administrator > Enable Admin Access');
            } else {
                console.log('✅ admin_access habilitado via PUT!');
            }
        } else {
            console.log('✅ admin_access habilitado via PATCH!');
        }

        // Verificar resultado
        console.log('\n🔍 Verificando resultado...\n');
        const verifyRes = await fetch(`${DIRECTUS_URL}/roles/${ADMIN_ROLE_ID}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const verifyData = await verifyRes.json();
        
        if (verifyData.data) {
            console.log('📋 Configuração atual do role:');
            console.log(`   Admin Access: ${verifyData.data.admin_access || false}`);
            console.log(`   App Access: ${verifyData.data.app_access || false}`);
            
            if (verifyData.data.admin_access) {
                console.log('\n✅ Sucesso! O role Administrator agora tem acesso total.');
                console.log('💡 IMPORTANTE: Faça logout e login novamente no aplicativo para atualizar o token.');
            } else {
                console.log('\n⚠️ admin_access ainda está desabilitado.');
                console.log('💡 Você precisa habilitar manualmente no Directus Admin UI:');
                console.log('   1. Acesse http://91.99.137.101:8057/admin');
                console.log('   2. Vá em Settings > Roles & Permissions');
                console.log('   3. Clique no role "Administrator"');
                console.log('   4. Marque "Admin Access" e salve');
            }
        }

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    }
}

habilitarAdminAccess();
