import { createDirectus, rest, readCollections } from '@directus/sdk';

const directusUrl = process.env.VITE_DIRECTUS_URL || 'http://91.99.137.101:8057';
const directusToken = process.env.VITE_DIRECTUS_TOKEN || '4JddQcHU_IcUS9WmZEPGbitqvy_fI9Dn';

const client = createDirectus(directusUrl).with(rest());

async function listCollections() {
    try {
        console.log(`\n🔗 Conectando ao Directus: ${directusUrl}\n`);

        const collections = await client.request(
            readCollections()
        );

        console.log(`✅ Total de collections encontradas: ${collections.length}\n`);

        // Separar collections do sistema e da aplicação
        const systemCollections = collections.filter(c => c.collection.startsWith('directus_'));
        const appCollections = collections.filter(c => !c.collection.startsWith('directus_'));

        console.log('📦 COLLECTIONS DA APLICAÇÃO:\n');
        appCollections
            .sort((a, b) => a.collection.localeCompare(b.collection))
            .forEach((col, i) => {
                const icon = col.meta?.icon || '📄';
                const note = col.meta?.note || 'Sem descrição';
                console.log(`${i + 1}. ${icon} ${col.collection}`);
                console.log(`   ${note}\n`);
            });

        console.log(`\n🔧 COLLECTIONS DO SISTEMA DIRECTUS: ${systemCollections.length} collections\n`);

        // Verificar especificamente a collection 'fotos'
        const fotosCollection = collections.find(c => c.collection === 'fotos');
        if (fotosCollection) {
            console.log('\n📷 COLLECTION "fotos" ENCONTRADA:');
            console.log(JSON.stringify(fotosCollection, null, 2));
        } else {
            console.log('\n❌ Collection "fotos" NÃO ENCONTRADA!');
        }

    } catch (error) {
        console.error('❌ Erro ao conectar:', error.message);
        console.error('Detalhes:', error);
    }
}

listCollections();
