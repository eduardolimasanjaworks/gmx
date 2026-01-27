
/**
 * Script para verificar se as collections estão prontas para receber arquivos
 * Verifica:
 * 1. Se as collections existem
 * 2. Se o campo 'file' existe e está configurado corretamente
 * 3. Se a relação com directus_files está configurada
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

const COLLECTIONS_TO_CHECK = [
    'delivery_receipts',
    'payment_receipts',
    'shipment_documents'
];

async function checkCollections() {
    try {
        console.log('🔍 Verificando estrutura das collections para arquivos...\n');

        for (const collectionName of COLLECTIONS_TO_CHECK) {
            console.log(`\n📦 Verificando: ${collectionName}`);
            console.log('─'.repeat(50));

            // 1. Verificar se a collection existe
            const collectionRes = await fetch(`${DIRECTUS_URL}/collections/${collectionName}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (!collectionRes.ok) {
                console.log(`   ❌ Collection não existe! Execute setup_documents_schema.js`);
                continue;
            }

            const collection = await collectionRes.json();
            console.log(`   ✅ Collection existe`);

            // 2. Verificar campos
            const fieldsRes = await fetch(`${DIRECTUS_URL}/fields/${collectionName}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (!fieldsRes.ok) {
                console.log(`   ❌ Não foi possível ler campos`);
                continue;
            }

            const fieldsData = await fieldsRes.json();
            const fields = fieldsData.data || [];

            // Verificar campo 'file'
            const fileField = fields.find(f => f.field === 'file');
            if (!fileField) {
                console.log(`   ❌ Campo 'file' não encontrado!`);
            } else {
                console.log(`   ✅ Campo 'file' existe`);
                console.log(`      Tipo: ${fileField.type}`);
                console.log(`      Interface: ${fileField.meta?.interface || 'N/A'}`);
                
                if (fileField.type !== 'uuid') {
                    console.log(`   ⚠️  ATENÇÃO: Campo 'file' deveria ser tipo 'uuid'`);
                }
            }

            // Verificar outros campos úteis
            const hasFileName = fields.find(f => f.field === 'file_name');
            const hasFileSize = fields.find(f => f.field === 'file_size');
            const hasFileUrl = fields.find(f => f.field === 'file_url');

            console.log(`   ${hasFileName ? '✅' : '⚠️ '} Campo 'file_name': ${hasFileName ? 'existe' : 'não encontrado'}`);
            console.log(`   ${hasFileSize ? '✅' : '⚠️ '} Campo 'file_size': ${hasFileSize ? 'existe' : 'não encontrado'}`);
            console.log(`   ${hasFileUrl ? '✅' : '⚠️ '} Campo 'file_url': ${hasFileUrl ? 'existe (legacy)' : 'não encontrado'}`);

            // 3. Verificar relações
            const relationsRes = await fetch(`${DIRECTUS_URL}/relations?filter[collection][_eq]=${collectionName}&filter[field][_eq]=file`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (relationsRes.ok) {
                const relationsData = await relationsRes.json();
                const relation = relationsData.data?.[0];

                if (!relation) {
                    console.log(`   ❌ Relação com directus_files não encontrada!`);
                } else {
                    console.log(`   ✅ Relação configurada`);
                    console.log(`      Collection relacionada: ${relation.related_collection}`);
                    console.log(`      Tipo: ${relation.meta?.one_field ? 'M2O' : 'O2M'}`);
                    
                    if (relation.related_collection !== 'directus_files') {
                        console.log(`   ⚠️  ATENÇÃO: Deveria relacionar com 'directus_files'`);
                    }
                }
            }
        }

        // 4. Verificar collection directus_files
        console.log(`\n\n📁 Verificando: directus_files (collection do Directus)`);
        console.log('─'.repeat(50));
        
        const filesCollectionRes = await fetch(`${DIRECTUS_URL}/collections/directus_files`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

        if (filesCollectionRes.ok) {
            console.log(`   ✅ Collection directus_files existe (é nativa do Directus)`);
        } else {
            console.log(`   ❌ ERRO CRÍTICO: Collection directus_files não existe!`);
        }

        // 5. Verificar permissões
        console.log(`\n\n🔐 Verificando permissões...`);
        console.log('─'.repeat(50));

        for (const collectionName of [...COLLECTIONS_TO_CHECK, 'directus_files']) {
            const permsRes = await fetch(`${DIRECTUS_URL}/permissions?filter[collection][_eq]=${collectionName}&limit=1`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (permsRes.ok) {
                const permsData = await permsRes.json();
                if (permsData.data && permsData.data.length > 0) {
                    console.log(`   ✅ ${collectionName}: Permissões configuradas`);
                } else {
                    console.log(`   ❌ ${collectionName}: Sem permissões! Execute setup_documents_permissions.js`);
                }
            }
        }

        console.log(`\n\n✅ Verificação concluída!`);
        console.log(`\n📝 Próximos passos:`);
        console.log(`   1. Se alguma collection não existe: Execute setup_documents_schema.js`);
        console.log(`   2. Se faltam permissões: Execute setup_documents_permissions.js`);
        console.log(`   3. Se erro 503: Verifique configuração de storage no Directus`);

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    }
}

checkCollections();
