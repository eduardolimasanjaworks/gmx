
/**
 * Debug: verificar por que as permissões não estão sendo criadas
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const ADMIN_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

async function debugCriarPermissao() {
    try {
        console.log('🔍 Debugando criação de permissão...\n');

        // Tentar criar uma permissão simples
        const createRes = await fetch(`${DIRECTUS_URL}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: ADMIN_ROLE_ID,
                collection: 'delivery_receipts',
                action: 'read',
                fields: ['*'],
                permissions: {},
                validation: {}
            })
        });

        const createData = await createRes.json();
        
        console.log('Status:', createRes.status);
        console.log('Response completa:');
        console.log(JSON.stringify(createData, null, 2));

        if (createData.errors) {
            console.log('\n❌ Erros encontrados:');
            createData.errors.forEach(err => {
                console.log(`   - ${err.message}`);
                if (err.extensions) {
                    console.log(`     Extensions:`, err.extensions);
                }
            });
        }

        if (createData.data) {
            console.log('\n✅ Permissão criada com sucesso!');
            console.log('ID:', createData.data.id);
            
            // Verificar se aparece na listagem
            console.log('\n🔍 Verificando se aparece na listagem...');
            const listRes = await fetch(
                `${DIRECTUS_URL}/permissions?filter[collection][_eq]=delivery_receipts&filter[action][_eq]=read&filter[role][_eq]=${ADMIN_ROLE_ID}`,
                {
                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                }
            );
            const listData = await listRes.json();
            
            console.log('Resultado da listagem:');
            console.log(JSON.stringify(listData, null, 2));
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

debugCriarPermissao();
