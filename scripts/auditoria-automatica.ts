/**
 * Script de Auditoria Automática
 * Executa diariamente para detectar problemas críticos
 * Deve ser executado via cron job ou scheduler
 */

import { createDirectus, rest, staticToken, readItems, createItem } from '@directus/sdk';

const DIRECTUS_URL = process.env.VITE_DIRECTUS_URL || 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = process.env.VITE_DIRECTUS_TOKEN || '';

const directus = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

interface AuditResult {
    tipo: string;
    severidade: 'baixa' | 'media' | 'alta' | 'critica';
    titulo: string;
    descricao: string;
    motorista_id?: string;
    embarque_id?: string;
    acao_sugerida?: string;
}

/**
 * Verifica CNHs vencidas ou próximas do vencimento
 */
async function auditarCNHs(): Promise<AuditResult[]> {
    const alertas: AuditResult[] = [];
    const hoje = new Date();
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
        const cnhs = await directus.request(
            readItems('cnh', {
                fields: ['id', 'motorista_id', 'validade', 'motorista_id.nome', 'motorista_id.sobrenome'],
                filter: {
                    validade: { _lte: em7Dias.toISOString().split('T')[0] },
                },
            })
        );

        for (const cnh of cnhs as any[]) {
            const validade = new Date(cnh.validade);
            const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

            let severidade: 'baixa' | 'media' | 'alta' | 'critica' = 'media';
            if (diasRestantes < 0) severidade = 'critica';
            else if (diasRestantes <= 3) severidade = 'alta';

            alertas.push({
                tipo: 'documento_vencido',
                severidade,
                titulo: `CNH ${diasRestantes < 0 ? 'vencida' : 'vencendo em breve'}`,
                descricao: `CNH do motorista ${cnh.motorista_id?.nome || 'Desconhecido'} ${diasRestantes < 0 ? 'venceu há ' + Math.abs(diasRestantes) + ' dias' : 'vence em ' + diasRestantes + ' dias'
                    }`,
                motorista_id: typeof cnh.motorista_id === 'object' ? cnh.motorista_id.id : cnh.motorista_id,
                acao_sugerida: 'Bloquear motorista e solicitar renovação urgente',
            });
        }
    } catch (error) {
        console.error('Erro ao auditar CNHs:', error);
    }

    return alertas;
}

/**
 * Verifica cargas sem aceite há muito tempo
 */
async function auditarCargasSemAceite(): Promise<AuditResult[]> {
    const alertas: AuditResult[] = [];
    const duasHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000);

    try {
        const ofertas = await directus.request(
            readItems('vehicle_matches', {
                filter: {
                    status: { _eq: 'offered' },
                    created_at: { _lte: duasHorasAtras.toISOString() },
                },
                fields: ['id', 'embarque_id', 'created_at'],
            })
        );

        for (const oferta of ofertas as any[]) {
            const horasEspera = Math.floor((Date.now() - new Date(oferta.created_at).getTime()) / (1000 * 60 * 60));

            alertas.push({
                tipo: 'carga_sem_aceite',
                severidade: horasEspera > 6 ? 'alta' : 'media',
                titulo: 'Carga aguardando aceite',
                descricao: `Oferta enviada há ${horasEspera}h sem resposta`,
                embarque_id: oferta.embarque_id,
                acao_sugerida: 'Contatar motorista ou buscar alternativa',
            });
        }
    } catch (error) {
        console.error('Erro ao auditar cargas sem aceite:', error);
    }

    return alertas;
}

/**
 * Verifica motoristas inativos
 */
async function auditarMotoristasInativos(): Promise<AuditResult[]> {
    const alertas: AuditResult[] = [];
    const doisDiasAtras = new Date(Date.now() - 48 * 60 * 60 * 1000);

    try {
        const disponibilidades = await directus.request(
            readItems('disponivel', {
                fields: ['motorista_id', 'date_created', 'motorista_id.nome'],
                sort: ['-date_created'],
                limit: 1000,
            })
        );

        const motoristasVistos = new Set();
        const motoristasInativos: any[] = [];

        for (const disp of disponibilidades as any[]) {
            const mId = typeof disp.motorista_id === 'object' ? disp.motorista_id.id : disp.motorista_id;
            if (!mId || motoristasVistos.has(mId)) continue;
            motoristasVistos.add(mId);

            const ultimaAtualizacao = new Date(disp.date_created);
            if (ultimaAtualizacao < doisDiasAtras) {
                motoristasInativos.push({
                    id: mId,
                    nome: disp.motorista_id?.nome || 'Desconhecido',
                    ultima_atualizacao: ultimaAtualizacao,
                });
            }
        }

        for (const motorista of motoristasInativos) {
            const horasInativo = Math.floor((Date.now() - motorista.ultima_atualizacao.getTime()) / (1000 * 60 * 60));

            alertas.push({
                tipo: 'motorista_inativo',
                severidade: horasInativo > 72 ? 'alta' : 'media',
                titulo: 'Motorista sem atualização',
                descricao: `${motorista.nome} sem atualizar status há ${horasInativo}h`,
                motorista_id: motorista.id,
                acao_sugerida: 'Entrar em contato para verificar situação',
            });
        }
    } catch (error) {
        console.error('Erro ao auditar motoristas inativos:', error);
    }

    return alertas;
}

/**
 * Função principal de auditoria
 */
async function executarAuditoria() {
    console.log('[AUDITORIA] Iniciando auditoria automática...');
    const inicio = Date.now();

    try {
        // Executar todas as auditorias em paralelo
        const [cnhsAlertas, cargasAlertas, inativosAlertas] = await Promise.all([
            auditarCNHs(),
            auditarCargasSemAceite(),
            auditarMotoristasInativos(),
        ]);

        const todosAlertas = [...cnhsAlertas, ...cargasAlertas, ...inativosAlertas];

        console.log(`[AUDITORIA] ${todosAlertas.length} alertas detectados`);

        // Salvar alertas no banco
        for (const alerta of todosAlertas) {
            try {
                await directus.request(
                    createItem('operational_alerts' as any, alerta)
                );
            } catch (error) {
                console.error('Erro ao salvar alerta:', error);
            }
        }

        const duracao = ((Date.now() - inicio) / 1000).toFixed(2);
        console.log(`[AUDITORIA] Concluída em ${duracao}s`);
    } catch (error) {
        console.error('[AUDITORIA] Erro fatal:', error);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    executarAuditoria().then(() => process.exit(0));
}

export { executarAuditoria };
