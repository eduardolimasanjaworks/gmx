import { createDirectus, rest, readItems, deleteItems } from '@directus/sdk';

const directusUrl = process.env.VITE_DIRECTUS_URL || 'http://91.99.137.101:8057';

const client = createDirectus(directusUrl).with(rest());

async function deleteAllEmbarques() {
    try {
        console.log(`\n🔗 Conectando ao Directus: ${directusUrl}\n`);

        const items = await client.request(
            readItems('embarques', {
                fields: ['id'],
                limit: -1
            })
        );

        if (items.length === 0) {
            console.log('✅ A tabela embarques já está vazia.\n');
            return;
        }

        console.log(`🗑️ Deletando ${items.length} embarques...\n`);

        const ids = items.map(item => item.id);

        // Exclui passando todos os IDs em lote
        await client.request(deleteItems('embarques', ids));

        console.log(`✅ Sucesso! Foram deletados ${ids.length} registros.\n`);

    } catch (error) {
        console.error('❌ Erro ao deletar:', error.message);
        console.error('Detalhes:', error);
    }
}

deleteAllEmbarques();
