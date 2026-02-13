import { createDirectus, rest, readCollections, readFieldsByCollection, authentication } from '@directus/sdk';

const directusUrl = 'http://91.99.137.101:8057';
const adminToken = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

const client = createDirectus(directusUrl).with(rest()).with(authentication('json'));

async function checkEmbarquesSchema() {
    try {
        console.log(`\n🔗 Conectando ao Directus...\n`);

        // Listar todas as collections
        const collections = await client.request(
            readCollections(),
            {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            }
        );

        const appCollections = collections.filter(c => !c.collection.startsWith('directus_'));

        console.log('📦 COLLECTIONS DA APLICAÇÃO:\n');
        appCollections.forEach((col, i) => {
            console.log(`${i + 1}. ${col.collection}`);
        });

        // Verificar se existe collection 'embarques'
        const embarquesExists = appCollections.find(c => c.collection === 'embarques');

        if (embarquesExists) {
            console.log('\n✅ Collection "embarques" EXISTE!\n');

            // Buscar campos da collection embarques
            const fields = await client.request(
                readFieldsByCollection('embarques'),
                {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                }
            );

            console.log('📋 Campos da collection "embarques":\n');
            fields.forEach((field, i) => {
                console.log(`${i + 1}. ${field.field} (${field.type})`);
            });
        } else {
            console.log('\n❌ Collection "embarques" NÃO EXISTE!\n');
            console.log('Será necessário criar a collection com todos os campos.');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

checkEmbarquesSchema();
