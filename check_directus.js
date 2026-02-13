// Script simples para listar collections do Directus
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

async function listCollections() {
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

        console.log(`✅ Total de collections: ${collections.length}\n`);

        // Filtrar collections da aplicação
        const appCollections = collections.filter(c => !c.collection.startsWith('directus_'));

        console.log('📦 COLLECTIONS DA APLICAÇÃO:\n');
        appCollections.forEach((col, i) => {
            const icon = col.meta?.icon || '📄';
            const note = col.meta?.note || '';
            console.log(`${i + 1}. [${icon}] ${col.collection}`);
            if (note) console.log(`   ${note}`);
        });

        console.log(`\n✅ Conexão verificada com sucesso!`);

        // Verificar 'fotos'
        const fotos = appCollections.find(c => c.collection === 'fotos');
        if (fotos) {
            console.log(`\n📷 Collection "fotos" encontrada!`);
            console.log(`   Icon: ${fotos.meta?.icon}`);
            console.log(`   Note: ${fotos.meta?.note}`);
        }

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
    }
}

listCollections();
