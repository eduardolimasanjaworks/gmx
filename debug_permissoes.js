
/**
 * Script para debugar permissões e ver exatamente como estão configuradas
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

const COLLECTIONS = [
    'delivery_receipts',
    'payment_receipts',
    'shipment_documents',
    'directus_files'
];

async function debugPermissoes() {
    try {
        console.log('🔍 Debugando permissões...\n');

        for (const collection of COLLECTIONS) {
            console.log(`\n📦 ${collection}:`);
            console.log('═'.repeat(60));
            
            // Buscar TODAS as permissões desta collection
            const allPermsRes = await fetch(`${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const allPermsData = await allPermsRes.json();
            
            if (allPermsData.data && allPermsData.data.length > 0) {
                console.log(`Total de permissões: ${allPermsData.data.length}\n`);
                
                allPermsData.data.forEach((perm, index) => {
                    console.log(`  Permissão ${index + 1}:`);
                    console.log(`    ID: ${perm.id}`);
                    console.log(`    Action: ${perm.action}`);
                    console.log(`    Role: ${perm.role || 'null (Public)'}`);
                    console.log(`    Policy: ${perm.policy || 'N/A'}`);
                    console.log(`    Fields: ${JSON.stringify(perm.fields)}`);
                    console.log(`    Permissions: ${JSON.stringify(perm.permissions)}`);
                    console.log('');
                });
            } else {
                console.log('❌ Nenhuma permissão encontrada');
            }
        }

        // Verificar se há permissões para o role Administrator
        console.log('\n\n🔐 Verificando permissões do role Administrator...');
        const adminRoleId = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';
        
        for (const collection of COLLECTIONS) {
            const rolePermsRes = await fetch(`${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collection}&filter[role][_eq]=${adminRoleId}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const rolePermsData = await rolePermsRes.json();
            
            console.log(`\n${collection}:`);
            if (rolePermsData.data && rolePermsData.data.length > 0) {
                console.log(`  ✅ ${rolePermsData.data.length} permissão(ões) encontrada(s)`);
                rolePermsData.data.forEach(p => {
                    console.log(`     - ${p.action} (Policy: ${p.policy})`);
                });
            } else {
                console.log(`  ❌ Nenhuma permissão para role Administrator`);
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

debugPermissoes();
