/**
 * Sistema de Auto-Matching Inteligente
 * Envia ofertas automaticamente para os melhores motoristas
 * Executa em background via webhook ou cron
 */

import { createDirectus, rest, staticToken, readItems, createItem, updateItem } from '@directus/sdk';
import { calcularMatchingScore, MatchingCriteria } from './matchingAlgorithm';

const DIRECTUS_URL = process.env.VITE_DIRECTUS_URL || 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = process.env.VITE_DIRECTUS_TOKEN || '';

const directus = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

interface AutoMatchConfig {
    score_minimo: number; // Score mínimo para enviar oferta (ex: 70)
    max_ofertas_por_carga: number; // Quantos motoristas ofertar por carga (ex: 5)
    enviar_apenas_alta_compatibilidade: boolean; // Se true, só envia para score >= 80
    intervalo_entre_ofertas_minutos: number; // Tempo de espera entre ofertas (ex: 5min)
}

const CONFIG_PADRAO: AutoMatchConfig = {
    score_minimo: 70,
    max_ofertas_por_carga: 5,
    enviar_apenas_alta_compatibilidade: false,
    intervalo_entre_ofertas_minutos: 5,
};

/**
 * Busca cargas que precisam de motorista
 */
async function buscarCargasPendentes() {
    try {
        const embarques = await directus.request(
            readItems('embarques', {
                filter: {
                    status: { _in: ['pending', 'awaiting_driver'] },
                    // Não buscar cargas que já têm ofertas recentes (últimos 30 min)
                    date_created: { _gte: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
                },
                fields: ['*'],
                sort: ['-created_at'],
                limit: 20,
            })
        );

        return embarques;
    } catch (error) {
        console.error('[AUTO-MATCH] Erro ao buscar cargas pendentes:', error);
        return [];
    }
}

/**
 * Busca motoristas elegíveis
 */
async function buscarMotoristasElegiveis() {
    try {
        // 1. Buscar motoristas ativos
        const motoristas = await directus.request(
            readItems('cadastro_motorista', {
                fields: ['id', 'nome', 'sobrenome', 'telefone', 'cidade', 'estado'],
                filter: {
                    status: { _eq: 'active' },
                },
                limit: 200,
            })
        );

        // 2. Buscar disponibilidade
        const disponibilidades = await directus.request(
            readItems('disponivel', {
                fields: ['*'],
                sort: ['-date_created'],
                limit: 1000,
            })
        );

        // Mapear última disponibilidade
        const dispMap = new Map();
        for (const disp of disponibilidades) {
            const mId = typeof disp.motorista_id === 'object' ? (disp.motorista_id as any)?.id : disp.motorista_id;
            if (mId && !dispMap.has(mId)) {
                dispMap.set(mId, disp);
            }
        }

        // 3. Filtrar apenas disponíveis ou retornando
        const elegíveis = motoristas
            .map((m: any) => {
                const disp = dispMap.get(m.id);
                return {
                    ...m,
                    disponibilidade: disp,
                };
            })
            .filter((m: any) => {
                const status = m.disponibilidade?.status;
                return status === 'disponivel' || status === 'retornando';
            });

        return elegíveis;
    } catch (error) {
        console.error('[AUTO-MATCH] Erro ao buscar motoristas:', error);
        return [];
    }
}

/**
 * Verifica se já existe oferta recente para este motorista nesta carga
 */
async function jaTemOfertaRecente(embarqueId: string, motoristaId: string): Promise<boolean> {
    try {
        const ofertas = await directus.request(
            readItems('vehicle_matches', {
                filter: {
                    embarque_id: { _eq: embarqueId },
                    motorista_id: { _eq: motoristaId },
                    created_at: { _gte: new Date(Date.now() - 60 * 60 * 1000).toISOString() }, // Última hora
                },
                limit: 1,
            })
        );

        return ofertas.length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Cria oferta automática no sistema
 */
async function criarOfertaAutomatica(
    embarqueId: string,
    motoristaId: string,
    score: number,
    justificativa: any
) {
    try {
        await directus.request(
            createItem('vehicle_matches', {
                embarque_id: embarqueId,
                motorista_id: motoristaId,
                status: 'offered',
                score_compatibilidade: score,
                justificativa_match: JSON.stringify(justificativa),
                oferecido_automaticamente: true,
                created_at: new Date().toISOString(),
            })
        );

        // Salvar score no histórico
        await directus.request(
            createItem('matching_scores' as any, {
                embarque_id: embarqueId,
                motorista_id: motoristaId,
                score_total: score,
                justificativa: justificativa,
                sugerido_em: new Date().toISOString(),
            })
        );

        console.log(`[AUTO-MATCH] ✅ Oferta enviada para motorista ${motoristaId} (Score: ${score})`);
        return true;
    } catch (error) {
        console.error('[AUTO-MATCH] Erro ao criar oferta:', error);
        return false;
    }
}

/**
 * Envia notificação para o motorista via webhook n8n
 */
async function notificarMotorista(
    motoristaId: string,
    embarqueId: string,
    motoristaNome: string,
    motoristaWhatsApp: string,
    embarqueData: any,
    score: any
) {
    const { notificarMotoristaViaWebhook } = await import('../services/notificationService');

    await notificarMotoristaViaWebhook({
        motorista_id: motoristaId,
        motorista_nome: motoristaNome,
        motorista_telefone: motoristaWhatsApp,
        embarque_id: embarqueId,
        origem: embarqueData.origin,
        destino: embarqueData.destination,
        produto: embarqueData.produto_predominante,
        peso_kg: embarqueData.peso_total || 0,
        valor_frete: embarqueData.valor_frete,
        score_compatibilidade: score.score_total,
        data_coleta: embarqueData.data_coleta,
        urgencia: embarqueData.urgencia,
        justificativa: score.justificativa,
    });
}

/**
 * Processa uma carga e envia ofertas automaticamente
 */
async function processarCarga(embarque: any, motoristas: any[], config: AutoMatchConfig) {
    console.log(`\n[AUTO-MATCH] Processando carga #${embarque.id.substring(0, 8)}...`);

    const embarqueData: MatchingCriteria['embarque'] = {
        id: embarque.id,
        origin: embarque.origin || '',
        destination: embarque.destination || '',
        produto_predominante: embarque.produto_predominante || '',
        tipo_carga: embarque.tipo_carga || 'geral',
        peso_total: embarque.peso_total,
        valor_frete: embarque.total_value,
        data_coleta: embarque.pickup_date || embarque.created_at,
        urgencia: 'media',
    };

    // Calcular score para todos os motoristas
    const scores = [];
    for (const motorista of motoristas) {
        const disp = motorista.disponibilidade;

        const motoristaData: MatchingCriteria['motorista'] = {
            id: motorista.id,
            nome: `${motorista.nome} ${motorista.sobrenome || ''}`.trim(),
            localizacao_atual: disp?.localizacao_atual || `${motorista.cidade}, ${motorista.estado}`,
            latitude: disp?.latitude,
            longitude: disp?.longitude,
            status: disp?.status || 'indisponivel',
            disponivel_em: disp?.disponivel_em,
            tipo_veiculo: 'Carreta', // TODO: buscar do cadastro real
            capacidade_kg: 30000,
            historico_rotas: [],
            viagens_concluidas: 0,
            taxa_aceite: 85,
            gr_aprovada: true,
        };

        const score = calcularMatchingScore(embarqueData, motoristaData);
        scores.push({ ...score, telefone: motorista.telefone });
    }

    // Ordenar por score (maior primeiro)
    scores.sort((a, b) => b.score_total - a.score_total);

    // Filtrar por score mínimo
    const candidatos = scores.filter((s) => s.score_total >= config.score_minimo);

    if (config.enviar_apenas_alta_compatibilidade) {
        const altaCompatibilidade = candidatos.filter((s) => s.compatibilidade === 'alta');
        if (altaCompatibilidade.length === 0) {
            console.log('[AUTO-MATCH] ⚠️ Nenhum motorista com alta compatibilidade. Pulando carga.');
            return;
        }
    }

    // Pegar os N melhores
    const melhores = candidatos.slice(0, config.max_ofertas_por_carga);

    if (melhores.length === 0) {
        console.log('[AUTO-MATCH] ⚠️ Nenhum motorista elegível encontrado.');
        return;
    }

    console.log(`[AUTO-MATCH] 🎯 ${melhores.length} motoristas selecionados:`);
    melhores.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.motorista_nome} - Score: ${m.score_total} (${m.compatibilidade})`);
    });

    // Enviar ofertas com intervalo
    for (let i = 0; i < melhores.length; i++) {
        const candidato = melhores[i];

        // Verificar se já tem oferta recente
        const temOferta = await jaTemOfertaRecente(embarque.id, candidato.motorista_id);
        if (temOferta) {
            console.log(`[AUTO-MATCH] ⏭️ Pulando ${candidato.motorista_nome} (oferta já enviada)`);
            continue;
        }

        // Criar oferta
        const sucesso = await criarOfertaAutomatica(
            embarque.id,
            candidato.motorista_id,
            candidato.score_total,
            candidato.justificativa
        );

        if (sucesso) {
            // Notificar motorista via webhook n8n
            await notificarMotorista(
                candidato.motorista_id,
                embarque.id,
                candidato.motorista_nome,
                candidato.telefone || '',
                embarque,
                candidato
            );

            // Aguardar intervalo antes da próxima oferta (exceto na última)
            if (i < melhores.length - 1) {
                const intervalo = config.intervalo_entre_ofertas_minutos * 60 * 1000;
                console.log(`[AUTO-MATCH] ⏳ Aguardando ${config.intervalo_entre_ofertas_minutos}min...`);
                await new Promise((resolve) => setTimeout(resolve, intervalo));
            }
        }
    }
}

/**
 * Função principal - Executa auto-matching
 */
export async function executarAutoMatching(config: Partial<AutoMatchConfig> = {}) {
    const configFinal = { ...CONFIG_PADRAO, ...config };

    console.log('═══════════════════════════════════════════════════');
    console.log('🤖 AUTO-MATCHING INTELIGENTE - INICIANDO');
    console.log('═══════════════════════════════════════════════════');
    console.log(`⚙️ Configuração:`);
    console.log(`   - Score mínimo: ${configFinal.score_minimo}`);
    console.log(`   - Máx ofertas/carga: ${configFinal.max_ofertas_por_carga}`);
    console.log(`   - Apenas alta compat: ${configFinal.enviar_apenas_alta_compatibilidade ? 'SIM' : 'NÃO'}`);
    console.log('═══════════════════════════════════════════════════\n');

    const inicio = Date.now();

    try {
        // 1. Buscar cargas pendentes
        const cargas = await buscarCargasPendentes();
        console.log(`📦 ${cargas.length} cargas pendentes encontradas\n`);

        if (cargas.length === 0) {
            console.log('✅ Nenhuma carga pendente. Sistema em espera.');
            return;
        }

        // 2. Buscar motoristas elegíveis
        const motoristas = await buscarMotoristasElegiveis();
        console.log(`🚚 ${motoristas.length} motoristas elegíveis\n`);

        if (motoristas.length === 0) {
            console.log('⚠️ Nenhum motorista disponível no momento.');
            return;
        }

        // 3. Processar cada carga
        for (const carga of cargas) {
            await processarCarga(carga, motoristas, configFinal);
        }

        const duracao = ((Date.now() - inicio) / 1000).toFixed(2);
        console.log('\n═══════════════════════════════════════════════════');
        console.log(`✅ AUTO-MATCHING CONCLUÍDO em ${duracao}s`);
        console.log('═══════════════════════════════════════════════════');
    } catch (error) {
        console.error('\n❌ ERRO FATAL no auto-matching:', error);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    executarAutoMatching().then(() => process.exit(0));
}
