
/**
 * Verificar configuração do role Administrator
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const ADMIN_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

async function verificarRoleAdmin() {
    try {
        console.log('🔍 Verificando configuração do role Administrator...\n');

        // 1. Obter informações do role
        const roleRes = await fetch(`${DIRECTUS_URL}/roles/${ADMIN_ROLE_ID}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const roleData = await roleRes.json();
        
        if (roleData.errors) {
            console.error('❌ Erro ao buscar role:', roleData.errors);
            return;
        }

        const role = roleData.data;
        console.log('📋 Configuração do Role Administrator:');
        console.log(`   ID: ${role.id}`);
        console.log(`   Nome: ${role.name}`);
        console.log(`   Admin Access: ${role.admin_access || false}`);
        console.log(`   App Access: ${role.app_access || false}`);
        console.log('');

        // 2. Se admin_access estiver desabilitado, habilitar
        if (!role.admin_access) {
            console.log('⚠️ admin_access está desabilitado!');
            console.log('   Isso pode fazer com que o role precise de permissões explícitas.\n');
            
            console.log('💡 Opções:');
            console.log('   1. Habilitar admin_access (recomendado para Administrators)');
            console.log('   2. Criar permissões explícitas para todas as collections\n');
            
            const habilitar = process.argv.includes('--habilitar');
            if (habilitar) {
                console.log('🔧 Habilitando admin_access...');
                const updateRes = await fetch(`${DIRECTUS_URL}/roles/${ADMIN_ROLE_ID}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        admin_access: true
                    })
                });
                
                const updateData = await updateRes.json();
                if (updateData.errors) {
                    console.error('❌ Erro ao atualizar role:', updateData.errors);
                } else {
                    console.log('✅ admin_access habilitado!');
                }
            } else {
                console.log('💡 Para habilitar, execute: node verificar_role_admin.js --habilitar');
            }
        } else {
            console.log('✅ admin_access já está habilitado');
            console.log('   O role Administrator deve ter acesso total.\n');
            console.log('💡 Se ainda houver erros 403, o problema pode ser:');
            console.log('   1. Token do usuário no frontend está expirado');
            console.log('   2. Cache do Directus precisa ser limpo');
            console.log('   3. O usuário precisa fazer logout/login novamente');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

verificarRoleAdmin();
