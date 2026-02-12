
/**
 * Testar criação de permissão com role explicitamente
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';
const ADMIN_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

async function testarCriarComRole() {
    try {
        console.log('🧪 Testando criação de permissão com role...\n');
        console.log('Role ID:', ADMIN_ROLE_ID);
        console.log('');

        const createBody = {
            role: ADMIN_ROLE_ID,
            collection: 'delivery_receipts',
            action: 'read',
            fields: ['*'],
            permissions: {},
            validation: {},
            policy: { id: '7fb88d53-685e-41d6-87ef-5f22cc3ff5d8' }
        };

        console.log('Body enviado:');
        console.log(JSON.stringify(createBody, null, 2));
        console.log('');

        const createRes = await fetch(`${DIRECTUS_URL}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(createBody)
        });

        const createData = await createRes.json();
        
        console.log('Status:', createRes.status);
        console.log('Response:');
        console.log(JSON.stringify(createData, null, 2));

        if (createData.data) {
            // Verificar se o role foi salvo
            const verifyRes = await fetch(`${DIRECTUS_URL}/permissions/${createData.data.id}?fields=*`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const verifyData = await verifyRes.json();
            
            console.log('\n🔍 Verificando permissão criada:');
            console.log('Role salvo:', verifyData.data.role);
            console.log('Collection:', verifyData.data.collection);
            console.log('Action:', verifyData.data.action);
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

testarCriarComRole();
