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
        latitude?: number;
        longitude?: number;
        status: string;
        disponivel_em?: string;
        tipo_veiculo?: string;
        capacidade_kg?: number;
        historico_rotas?: string[];
        viagens_concluidas?: number;
        taxa_aceite?: number; // 0-100
        gr_aprovada?: boolean;
    };
}

export interface MatchingScore {
    motorista_id: string;
    motorista_nome: string;
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
function calcularScoreDisponibilidade(motorista: MatchingCriteria['motorista']): {
    score: number;
    justificativa: string;
    horas: number;
} {
    if (motorista.status === 'disponivel') {
        return { score: 100, justificativa: 'Disponível imediatamente', horas: 0 };
    }

    if (motorista.status === 'retornando' && motorista.disponivel_em) {
        const horasAteDisponivel =
            (new Date(motorista.disponivel_em).getTime() - Date.now()) / (1000 * 60 * 60);

        if (horasAteDisponivel < 0) {
            return { score: 100, justificativa: 'Já deveria estar disponível', horas: 0 };
        }

        if (horasAteDisponivel <= 2) {
            return { score: 90, justificativa: `Disponível em ${horasAteDisponivel.toFixed(1)}h`, horas: horasAteDisponivel };
        }
        if (horasAteDisponivel <= 6) {
            return { score: 70, justificativa: `Disponível em ${horasAteDisponivel.toFixed(1)}h`, horas: horasAteDisponivel };
        }
        if (horasAteDisponivel <= 12) {
            return { score: 50, justificativa: `Disponível em ${horasAteDisponivel.toFixed(1)}h`, horas: horasAteDisponivel };
        }
        return { score: 30, justificativa: `Disponível em ${horasAteDisponivel.toFixed(1)}h`, horas: horasAteDisponivel };
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
    // Geocoding simplificado (em produção, usar API real)
    const cidadesCoords: Record<string, { lat: number; lng: number }> = {
        'São Paulo': { lat: -23.5505, lng: -46.6333 },
        'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
        'Curitiba': { lat: -25.4284, lng: -49.2733 },
        'Porto Alegre': { lat: -30.0346, lng: -51.2177 },
        'Brasília': { lat: -15.8267, lng: -47.9218 },
    };

    const origemCity = embarque.origin.split(',')[0].trim();
    const motoristaCity = motorista.localizacao_atual?.split(',')[0].trim();

    if (!motoristaCity || !cidadesCoords[origemCity]) {
        return { score: 50, justificativa: 'Localização não disponível' };
    }

    const origemCoords = cidadesCoords[origemCity];
    const motoristaCoords = motorista.latitude && motorista.longitude
        ? { lat: motorista.latitude, lng: motorista.longitude }
        : cidadesCoords[motoristaCity];

    if (!motoristaCoords) {
        return { score: 50, justificativa: 'Coordenadas não disponíveis' };
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

    return {
        score,
        justificativa: `${distancia.toFixed(0)} km da origem`,
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
    const disponibilidade = calcularScoreDisponibilidade(motorista);
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
