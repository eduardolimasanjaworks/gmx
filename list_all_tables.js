// Script para listar TODAS as collections do Directus
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

async function listAllCollections() {
    try {
        console.log(`\n🔗 Conectando ao Directus: ${DIRECTUS_URL}\n`);

        const response = await fetch(`${DIRECTUS_URL}/collections`, {
            headers: {
                'Authorization': `Bearer ${DIRECTUS_TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const collections = result.data || [];

        console.log(`✅ TOTAL: ${collections.length} collections\n`);
        console.log('='.repeat(80));
        console.log('TODAS AS COLLECTIONS (TABELAS):');
        console.log('='.repeat(80) + '\n');

        // Separar por tipo
        const appCollections = collections.filter(c => !c.collection.startsWith('directus_'));
        const sysCollections = collections.filter(c => c.collection.startsWith('directus_'));

        console.log(`📦 APLICAÇÃO (${appCollections.length} tabelas):\n`);
        appCollections
            .sort((a, b) => a.collection.localeCompare(b.collection))
            .forEach((col, i) => {
                console.log(`${(i + 1).toString().padStart(2)}. ${col.collection}`);
            });

        console.log(`\n🔧 SISTEMA DIRECTUS (${sysCollections.length} tabelas):\n`);
        sysCollections
            .sort((a, b) => a.collection.localeCompare(b.collection))
            .forEach((col, i) => {
                console.log(`${(i + 1).toString().padStart(2)}. ${col.collection}`);
            });

        console.log('\n' + '='.repeat(80));
        console.log(`✅ Total: ${collections.length} collections listadas`);
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
    }
}

listAllCollections();
