
/**
 * Script para corrigir as relações do campo 'file' nas collections de documentos
 * As relações estão apontando para 'cadastro_motorista' mas deveriam apontar para 'directus_files'
 */

const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

const COLLECTIONS = [
    'delivery_receipts',
    'payment_receipts',
    'shipment_documents'
];

async function corrigirRelacoes() {
    try {
        console.log('🔧 Corrigindo relações dos campos de arquivo...\n');

        for (const collectionName of COLLECTIONS) {
            console.log(`\n📦 Processando: ${collectionName}`);
            console.log('─'.repeat(50));

            // 1. Buscar relação atual
            const relationsRes = await fetch(`${DIRECTUS_URL}/relations?filter[collection][_eq]=${collectionName}&filter[field][_eq]=file`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (!relationsRes.ok) {
                console.log(`   ❌ Erro ao buscar relações`);
                continue;
            }

            const relationsData = await relationsRes.json();
            const relation = relationsData.data?.[0];

            if (!relation) {
                console.log(`   ⚠️  Relação não encontrada. Criando nova relação...`);
                
                // Criar nova relação
                const createRes = await fetch(`${DIRECTUS_URL}/relations`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        collection: collectionName,
                        field: 'file',
                        related_collection: 'directus_files',
                        schema: {
                            on_delete: 'SET NULL'
                        }
                    })
                });

                const createData = await createRes.json();
                if (createData.errors) {
                    console.log(`   ❌ Erro ao criar relação:`, createData.errors);
                } else {
                    console.log(`   ✅ Relação criada com directus_files`);
                }
            } else {
                console.log(`   📋 Relação atual encontrada:`);
                console.log(`      Collection relacionada: ${relation.related_collection}`);

                if (relation.related_collection === 'directus_files') {
                    console.log(`   ✅ Relação já está correta!`);
                } else {
                    console.log(`   🔄 Corrigindo relação de '${relation.related_collection}' para 'directus_files'...`);

                    // Buscar todas as relações para encontrar o ID correto
                    const allRelationsRes = await fetch(`${DIRECTUS_URL}/relations?filter[collection][_eq]=${collectionName}&filter[field][_eq]=file`, {
                        headers: { 'Authorization': `Bearer ${TOKEN}` }
                    });
                    
                    const allRelationsData = await allRelationsRes.json();
                    const relations = allRelationsData.data || [];
                    
                    // Tentar atualizar cada relação encontrada
                    let updated = false;
                    for (const rel of relations) {
                        if (rel.related_collection !== 'directus_files') {
                            // Tentar atualizar a relação
                            const updateRes = await fetch(`${DIRECTUS_URL}/relations/${rel.id}`, {
                                method: 'PATCH',
                                headers: {
                                    'Authorization': `Bearer ${TOKEN}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    related_collection: 'directus_files',
                                    schema: {
                                        on_delete: 'SET NULL'
                                    }
                                })
                            });

                            if (updateRes.ok) {
                                console.log(`   ✅ Relação ${rel.id} atualizada!`);
                                updated = true;
                            } else {
                                // Se não conseguir atualizar, tentar deletar e criar nova
                                console.log(`   🔄 Tentando deletar relação ${rel.id}...`);
                                const deleteRes = await fetch(`${DIRECTUS_URL}/relations/${rel.id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${TOKEN}` }
                                });

                                if (deleteRes.ok) {
                                    console.log(`   ✅ Relação antiga removida`);
                                    
                                    // Criar relação correta
                                    const createRes = await fetch(`${DIRECTUS_URL}/relations`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${TOKEN}`,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            collection: collectionName,
                                            field: 'file',
                                            related_collection: 'directus_files',
                                            schema: {
                                                on_delete: 'SET NULL'
                                            }
                                        })
                                    });

                                    const createData = await createRes.json();
                                    if (createData.errors) {
                                        console.log(`   ❌ Erro ao criar relação:`, createData.errors);
                                    } else {
                                        console.log(`   ✅ Relação corrigida! Agora aponta para directus_files`);
                                        updated = true;
                                    }
                                } else {
                                    const deleteData = await deleteRes.json();
                                    console.log(`   ⚠️  Não foi possível deletar:`, deleteData);
                                }
                            }
                        }
                    }
                    
                    if (!updated) {
                        console.log(`   ⚠️  Não foi possível corrigir automaticamente.`);
                        console.log(`   💡 Você pode corrigir manualmente no Directus:`);
                        console.log(`      Settings > Data Model > ${collectionName} > file > Edit`);
                        console.log(`      Altere "Related Collection" de "cadastro_motorista" para "directus_files"`);
                    }
                }
            }
        }

        console.log(`\n\n✅ Correção de relações concluída!`);
        console.log(`\n📝 Próximo passo: Execute setup_documents_permissions.js para configurar permissões`);

    } catch (error) {
        console.error('❌ Erro crítico:', error);
    }
}

corrigirRelacoes();
