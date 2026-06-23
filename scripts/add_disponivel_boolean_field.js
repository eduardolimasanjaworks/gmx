/**
 * Script para adicionar campo 'disponivel' (Boolean) na tabela 'disponivel'
 * 
 * Este script:
 * 1. Adiciona o campo 'disponivel' (Boolean) na tabela 'disponivel'
 * 2. Migra dados existentes (status === 'disponivel' → disponivel = true)
 * 3. Define valor padrão como false
 */

import { createDirectus, rest, staticToken, createField, readItems, updateItem } from '@directus/sdk';

const DIRECTUS_URL = process.env.VITE_DIRECTUS_URL || 'https://gmx.sanjaworks.com/api';
const DIRECTUS_TOKEN = process.env.VITE_DIRECTUS_TOKEN || '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

const directus = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const TABLE_NAME = 'disponivel';

async function addDisponivelBooleanField() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🔄 ADICIONANDO CAMPO disponivel (Boolean)');
    console.log('═══════════════════════════════════════════════════\n');

    try {
        // 1. Adicionar campo 'disponivel' (Boolean)
        console.log('1️⃣ Criando campo disponivel (Boolean)...');
        try {
            await directus.request(
                createField(TABLE_NAME, {
                    field: 'disponivel',
                    type: 'boolean',
                    meta: {
                        interface: 'boolean',
                        display: 'Disponível',
                        display_options: {
                            labelOn: 'Disponível',
                            labelOff: 'Indisponível'
                        },
                        width: 'half'
                    },
                    schema: {
                        default_value: false,
                        is_nullable: false
                    }
                })
            );
            console.log('✅ Campo disponivel criado com sucesso!\n');
        } catch (error) {
            if (error?.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
                console.log('⚠️ Campo disponivel já existe. Continuando com migração de dados...\n');
            } else {
                throw error;
            }
        }

        // 2. Migrar dados existentes
        console.log('2️⃣ Migrando dados existentes...');
        console.log('   Buscando registros com status = "disponivel"...');
        
        const registros = await directus.request(
            readItems(TABLE_NAME, {
                filter: {
                    status: { _eq: 'disponivel' }
                },
                fields: ['id', 'status', 'disponivel'],
                limit: -1
            })
        );

        console.log(`   📊 Encontrados ${registros.length} registros com status="disponivel"`);

        let atualizados = 0;
        for (const registro of registros) {
            try {
                await directus.request(
                    updateItem(TABLE_NAME, registro.id, {
                        disponivel: true
                    })
                );
                atualizados++;
            } catch (error) {
                console.error(`   ❌ Erro ao atualizar registro ${registro.id}:`, error.message);
            }
        }

        console.log(`   ✅ ${atualizados} registros atualizados (disponivel = true)\n`);

        // 3. Atualizar registros com status != 'disponivel' para disponivel = false
        console.log('3️⃣ Atualizando registros indisponíveis...');
        
        const registrosIndisponiveis = await directus.request(
            readItems(TABLE_NAME, {
                filter: {
                    status: { _neq: 'disponivel' },
                    _or: [
                        { disponivel: { _null: true } },
                        { disponivel: { _eq: true } }
                    ]
                },
                fields: ['id', 'status'],
                limit: -1
            })
        );

        console.log(`   📊 Encontrados ${registrosIndisponiveis.length} registros indisponíveis`);

        let indisponiveisAtualizados = 0;
        for (const registro of registrosIndisponiveis) {
            try {
                await directus.request(
                    updateItem(TABLE_NAME, registro.id, {
                        disponivel: false
                    })
                );
                indisponiveisAtualizados++;
            } catch (error) {
                console.error(`   ❌ Erro ao atualizar registro ${registro.id}:`, error.message);
            }
        }

        console.log(`   ✅ ${indisponiveisAtualizados} registros atualizados (disponivel = false)\n`);

        console.log('═══════════════════════════════════════════════════');
        console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('═══════════════════════════════════════════════════');
        console.log('\n📝 PRÓXIMOS PASSOS:');
        console.log('   1. Atualizar código para usar campo disponivel (Boolean)');
        console.log('   2. Testar funcionalidades que dependem de disponibilidade');
        console.log('   3. Considerar remover campo status se não for mais necessário\n');

    } catch (error) {
        console.error('\n❌ ERRO NA MIGRAÇÃO:', error);
        console.error('Detalhes:', error.errors || error.message);
        process.exit(1);
    }
}

// Executar
addDisponivelBooleanField()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
