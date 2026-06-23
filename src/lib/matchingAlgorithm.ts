/**
 * Algoritmo de Matching Inteligente
 * Calcula compatibilidade entre cargas e motoristas
 * Score de 0 a 100 baseado em múltiplos critérios
 */

export interface MatchingCriteria {
    embarque: {
        id: string;
        origin: string;
        destination: string;
        config_rota_id?: number | null;
        origem_latitude?: number;
        origem_longitude?: number;
        destino_latitude?: number;
        destino_longitude?: number;
        produto_predominante: string;
        tipo_carga: string;
        peso_total?: number;
        valor_frete?: number;
        data_coleta: string;
        urgencia?: 'baixa' | 'media' | 'alta';
    };
    motorista: {
        id: string;
        nome: string;
        localizacao_atual?: string;
        localizacao_prevista?: string;
        latitude?: number;
        longitude?: number;
        status: string;
        disponivel_em?: string;
        data_ultima_atualizacao?: string;
        tipo_veiculo?: string;
        capacidade_kg?: number;
        historico_rotas?: string[];
        viagens_concluidas?: number;
        taxa_aceite?: number; // 0-100
        gr_aprovada?: boolean;
        operacoes_elegiveis?: string[];
    };
}

export interface MatchingScore {
    motorista_id: string;
    motorista_nome: string;
    localizacao_atual?: string;
    localizacao_prevista?: string;
    data_ultima_atualizacao?: string;
    score_total: number;
    score_disponibilidade: number;
    score_equipamento: number;
    score_localizacao: number;
    score_historico: number;
    score_comercial: number;
    compatibilidade: 'alta' | 'media' | 'baixa';
    justificativa: {
        disponibilidade: string;
        equipamento: string;
        localizacao: string;
        historico: string;
        comercial: string;
        alertas?: string[];
    };
    distancia_km?: number;
    tempo_ate_disponivel_horas?: number;
}

function formatarDataHora(valor?: string): string {
    if (!valor) return 'data não informada';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    return data.toLocaleString('pt-BR');
}

/**
 * Calcula distância aproximada entre dois pontos (Haversine)
 */
function calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Raio da Terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Score de Disponibilidade (0-100)
 * Quanto mais rápido disponível, maior o score
 */
function calcularScoreDisponibilidade(
    motorista: MatchingCriteria['motorista'],
    embarque?: MatchingCriteria['embarque']
): {
    score: number;
    justificativa: string;
    horas: number;
} {
    const referenciaData = embarque?.data_coleta ? new Date(embarque.data_coleta) : new Date();
    const referencia = Number.isNaN(referenciaData.getTime()) ? new Date() : referenciaData;

    if (motorista.status === 'disponivel' && !motorista.disponivel_em) {
        return {
            score: 100,
            justificativa:
                referencia > new Date()
                    ? `Disponível para a coleta prevista em ${formatarDataHora(embarque?.data_coleta)}`
                    : 'Disponível imediatamente',
            horas: 0,
        };
    }

    if (motorista.disponivel_em) {
        const horasAteDisponivel =
            (new Date(motorista.disponivel_em).getTime() - referencia.getTime()) / (1000 * 60 * 60);
        const complementoLocal = motorista.localizacao_prevista
            ? ` em ${motorista.localizacao_prevista}`
            : motorista.localizacao_atual
              ? ` saindo de ${motorista.localizacao_atual}`
              : '';

        if (horasAteDisponivel < 0) {
            return {
                score: 100,
                justificativa: `Já deve estar livre${complementoLocal}`,
                horas: 0,
            };
        }

        if (horasAteDisponivel <= 2) {
            return {
                score: 90,
                justificativa: `Previsto para liberar em ${horasAteDisponivel.toFixed(1)}h${complementoLocal}`,
                horas: horasAteDisponivel,
            };
        }
        if (horasAteDisponivel <= 6) {
            return {
                score: 70,
                justificativa: `Previsto para liberar em ${horasAteDisponivel.toFixed(1)}h${complementoLocal}`,
                horas: horasAteDisponivel,
            };
        }
        if (horasAteDisponivel <= 12) {
            return {
                score: 50,
                justificativa: `Previsto para liberar em ${horasAteDisponivel.toFixed(1)}h${complementoLocal}`,
                horas: horasAteDisponivel,
            };
        }
        return {
            score: 30,
            justificativa: `Previsto para liberar em ${horasAteDisponivel.toFixed(1)}h${complementoLocal}`,
            horas: horasAteDisponivel,
        };
    }

    return { score: 0, justificativa: 'Indisponível ou bloqueado', horas: 999 };
}

/**
 * Score de Equipamento (0-100)
 * Verifica compatibilidade do veículo com a carga
 */
function calcularScoreEquipamento(
    embarque: MatchingCriteria['embarque'],
    motorista: MatchingCriteria['motorista']
): { score: number; justificativa: string } {
    let score = 50; // Base
    const alertas: string[] = [];

    // Tipo de veículo compatível
    if (motorista.tipo_veiculo) {
        if (embarque.tipo_carga === 'granel' && motorista.tipo_veiculo.includes('graneleiro')) {
            score += 30;
        } else if (embarque.tipo_carga === 'container' && motorista.tipo_veiculo.includes('container')) {
            score += 30;
        } else {
            score += 10; // Genérico
        }
    }

    // Capacidade de carga
    if (embarque.peso_total && motorista.capacidade_kg) {
        if (motorista.capacidade_kg >= embarque.peso_total) {
            score += 20;
        } else {
            score -= 30;
            alertas.push('Capacidade insuficiente');
        }
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        justificativa: alertas.length > 0 ? alertas.join(', ') : 'Equipamento compatível'
    };
}

/**
 * Score de Localização (0-100)
 * Quanto mais próximo da origem, melhor
 */
function calcularScoreLocalizacao(
    embarque: MatchingCriteria['embarque'],
    motorista: MatchingCriteria['motorista']
): { score: number; justificativa: string; distancia_km?: number } {
    const origemCoords =
        Number.isFinite(embarque.origem_latitude) && Number.isFinite(embarque.origem_longitude)
            ? { lat: Number(embarque.origem_latitude), lng: Number(embarque.origem_longitude) }
            : null;

    if (!origemCoords) {
        return {
            score: 50,
            justificativa: embarque.config_rota_id
                ? `Rota #${embarque.config_rota_id} sem coordenadas de origem`
                : 'Rota sem coordenadas de origem',
        };
    }

    const motoristaCoords =
        Number.isFinite(motorista.latitude) && Number.isFinite(motorista.longitude)
            ? { lat: Number(motorista.latitude), lng: Number(motorista.longitude) }
            : null;

    if (!motoristaCoords) {
        const localInformado = motorista.localizacao_prevista || motorista.localizacao_atual;
        return {
            score: localInformado ? 35 : 20,
            justificativa: localInformado
                ? `Local informado sem coordenadas validadas: ${localInformado}`
                : 'Sem coordenadas validas do motorista',
        };
    }

    const distancia = calcularDistancia(
        origemCoords.lat,
        origemCoords.lng,
        motoristaCoords.lat,
        motoristaCoords.lng
    );

    let score = 100;
    if (distancia > 50) score = 90;
    if (distancia > 100) score = 70;
    if (distancia > 300) score = 50;
    if (distancia > 500) score = 30;
    if (distancia > 1000) score = 10;

    let complemento = 'comparando o ultimo GPS valido com a origem da carga';
    if (motorista.data_ultima_atualizacao) {
        const horasDesdeGps =
            (Date.now() - new Date(motorista.data_ultima_atualizacao).getTime()) / (1000 * 60 * 60);
        if (Number.isFinite(horasDesdeGps) && horasDesdeGps > 24) {
            score = Math.max(0, score - 10);
            complemento = `ultimo GPS atualizado ha ${horasDesdeGps.toFixed(0)}h`;
        }
    }
    if (motorista.disponivel_em && new Date(motorista.disponivel_em).getTime() > Date.now()) {
        score = Math.max(0, score - 5);
        complemento += motorista.localizacao_prevista
            ? ` · previsao futura em ${motorista.localizacao_prevista}`
            : ' · motorista ainda em deslocamento/liberacao futura';
    }

    return {
        score,
        justificativa: `${distancia.toFixed(0)} km da origem · ${complemento}`,
        distancia_km: distancia
    };
}

/**
 * Score de Histórico (0-100)
 * Baseado em performance passada
 */
function calcularScoreHistorico(
    embarque: MatchingCriteria['embarque'],
    motorista: MatchingCriteria['motorista']
): { score: number; justificativa: string } {
    let score = 50; // Base

    // Experiência geral
    if (motorista.viagens_concluidas) {
        if (motorista.viagens_concluidas > 100) score += 20;
        else if (motorista.viagens_concluidas > 50) score += 15;
        else if (motorista.viagens_concluidas > 20) score += 10;
        else if (motorista.viagens_concluidas > 5) score += 5;
    }

    // Taxa de aceite
    if (motorista.taxa_aceite !== undefined) {
        if (motorista.taxa_aceite > 80) score += 15;
        else if (motorista.taxa_aceite > 60) score += 10;
        else if (motorista.taxa_aceite < 40) score -= 10;
    }

    // Experiência na rota específica
    const destinoCity = embarque.destination.split(',')[0].trim();
    if (motorista.historico_rotas?.includes(destinoCity)) {
        score += 15;
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        justificativa: `${motorista.viagens_concluidas || 0} viagens concluídas`
    };
}

/**
 * Score Comercial (0-100)
 * GR aprovada, documentação em dia, etc
 */
function calcularScoreComercial(
    motorista: MatchingCriteria['motorista']
): { score: number; justificativa: string } {
    let score = 50;
    const alertas: string[] = [];

    if (motorista.gr_aprovada === true) {
        score += 50;
    } else if (motorista.gr_aprovada === false) {
        score -= 30;
        alertas.push('GR não aprovada');
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        justificativa: alertas.length > 0 ? alertas.join(', ') : 'Documentação OK'
    };
}

/**
 * Função principal de matching
 */
export function calcularMatchingScore(
    embarque: MatchingCriteria['embarque'],
    motorista: MatchingCriteria['motorista']
): MatchingScore {
    const disponibilidade = calcularScoreDisponibilidade(motorista, embarque);
    const equipamento = calcularScoreEquipamento(embarque, motorista);
    const localizacao = calcularScoreLocalizacao(embarque, motorista);
    const historico = calcularScoreHistorico(embarque, motorista);
    const comercial = calcularScoreComercial(motorista);

    // Pesos dos critérios (total = 100%)
    const PESO_DISPONIBILIDADE = 0.30;
    const PESO_EQUIPAMENTO = 0.25;
    const PESO_LOCALIZACAO = 0.20;
    const PESO_HISTORICO = 0.15;
    const PESO_COMERCIAL = 0.10;

    const scoreTotal =
        disponibilidade.score * PESO_DISPONIBILIDADE +
        equipamento.score * PESO_EQUIPAMENTO +
        localizacao.score * PESO_LOCALIZACAO +
        historico.score * PESO_HISTORICO +
        comercial.score * PESO_COMERCIAL;

    let compatibilidade: 'alta' | 'media' | 'baixa' = 'baixa';
    if (scoreTotal >= 80) compatibilidade = 'alta';
    else if (scoreTotal >= 60) compatibilidade = 'media';

    return {
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        localizacao_atual: motorista.localizacao_atual,
        localizacao_prevista: motorista.localizacao_prevista,
        data_ultima_atualizacao: motorista.data_ultima_atualizacao,
        score_total: Math.round(scoreTotal),
        score_disponibilidade: Math.round(disponibilidade.score),
        score_equipamento: Math.round(equipamento.score),
        score_localizacao: Math.round(localizacao.score),
        score_historico: Math.round(historico.score),
        score_comercial: Math.round(comercial.score),
        compatibilidade,
        justificativa: {
            disponibilidade: disponibilidade.justificativa,
            equipamento: equipamento.justificativa,
            localizacao: localizacao.justificativa,
            historico: historico.justificativa,
            comercial: comercial.justificativa,
        },
        distancia_km: localizacao.distancia_km,
        tempo_ate_disponivel_horas: disponibilidade.horas,
    };
}
