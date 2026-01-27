
/**
 * Script para corrigir o campo 'file' diretamente via API de fields
 * Atualiza a relação para apontar para directus_files
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

const COLLECTIONS = [
    'delivery_receipts',
    'payment_receipts',
    'shipment_documents'
];

async function corrigirCampoFile() {
    try {
        console.log('🔧 Corrigindo campo "file" para relacionar com directus_files...\n');

        for (const collectionName of COLLECTIONS) {
            console.log(`\n📦 Processando: ${collectionName}`);
            console.log('─'.repeat(50));

            // Buscar o campo atual
            const fieldRes = await fetch(`${DIRECTUS_URL}/fields/${collectionName}/file`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (!fieldRes.ok) {
                console.log(`   ❌ Campo 'file' não encontrado!`);
                continue;
            }

            const fieldData = await fieldRes.json();
            const field = fieldData.data;

            console.log(`   📋 Campo atual:`);
            console.log(`      Tipo: ${field.type}`);
            console.log(`      Interface: ${field.meta?.interface || 'N/A'}`);
            console.log(`      Special: ${field.special || 'N/A'}`);

            // Atualizar o campo para relacionar com directus_files
            const updateRes = await fetch(`${DIRECTUS_URL}/fields/${collectionName}/file`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    meta: {
                        ...field.meta,
                        interface: 'file',
                        special: ['file']
                    },
                    schema: {
                        foreign_key_table: 'directus_files',
                        foreign_key_column: 'id'
                    }
                })
            });

            const updateData = await updateRes.json();
            
            if (updateData.errors) {
                console.log(`   ❌ Erro ao atualizar:`, updateData.errors);
                console.log(`   💡 Tente corrigir manualmente no Directus:`);
                console.log(`      Settings > Data Model > ${collectionName} > file > Edit`);
                console.log(`      Altere "Related Collection" para "directus_files"`);
            } else {
                console.log(`   ✅ Campo atualizado!`);
            }
        }

        console.log(`\n\n✅ Correção concluída!`);
        console.log(`\n📝 Próximo passo: Execute setup_documents_permissions.js para configurar permissões`);

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    }
}

corrigirCampoFile();
