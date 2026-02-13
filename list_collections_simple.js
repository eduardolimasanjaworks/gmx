import { createDirectus, rest } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';

async function listAllCollections() {
    try {
        console.log('\n🔗 Conectando ao Directus...\n');

        // Fazer uma requisição HTTP direta para pegar as collections
        const response = await fetch(`${directusUrl}/collections?access_token=WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq`);

        if (!response.ok) {
            console.error(`❌ Erro HTTP: ${response.status} ${response.statusText}`);
            return;
        }

        const result = await response.json();
        const collections = result.data || [];

        console.log(`✅ Total de collections: ${collections.length}\n`);

        const appCollections = collections.filter(c => !c.collection.startsWith('directus_'));

        console.log('📦 COLLECTIONS DA APLICAÇÃO:\n');
        appCollections
            .sort((a, b) => a.collection.localeCompare(b.collection))
            .forEach((col, i) => {
                console.log(`${i + 1}. ${col.collection}`);
            });

        // Verificar se 'disponivel' existe
        const disponivelExists = collections.find(c => c.collection === 'disponivel');
        console.log(`\n${disponivelExists ? '✅' : '❌'} Collection "disponivel" ${disponivelExists ? 'EXISTE' : 'NÃO EXISTE'}`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

listAllCollections();
