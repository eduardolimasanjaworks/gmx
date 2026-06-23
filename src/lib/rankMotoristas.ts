/**
 * Ranking de motoristas para um embarque (score 0–100).
 */
import { directus } from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { calcularMatchingScore, type MatchingScore } from '@/lib/matchingAlgorithm';

export interface EmbarqueParaRank {
  id: string | number;
  config_rota_id?: number | string | null;
  origin?: string | null;
  destination?: string | null;
  origem_latitude?: number | string | null;
  origem_longitude?: number | string | null;
  destino_latitude?: number | string | null;
  destino_longitude?: number | string | null;
  produto_predominante?: string | null;
  tipo_carga?: string | null;
  peso_total?: number | null;
  total_value?: number | null;
  pickup_date?: string | null;
  created_at?: string | null;
  operacao?: string | null;
}

function normalizarOperacao(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function extrairOperacoesElegiveis(value: unknown): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      String(value)
        .split(/[;,/|]/g)
        .map(normalizarOperacao)
        .filter(Boolean),
    ),
  );
}

function numeroOpcional(value: unknown): number | undefined {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : undefined;
}

function statusElegivelDisponibilidade(item: Record<string, unknown>): boolean {
  const disponivel = item.disponivel === true;
  const status = String(item.status ?? '').toLowerCase();
  return disponivel || status === 'retornando' || Boolean(item.data_previsao_disponibilidade);
}

function inserirTopRanking(lista: MatchingScore[], score: MatchingScore, limite: number) {
  let index = lista.findIndex((item) => score.score_total > item.score_total);
  if (index === -1) index = lista.length;
  if (index >= limite) return;
  lista.splice(index, 0, score);
  if (lista.length > limite) {
    lista.pop();
  }
}

async function obterCoordenadasRota(
  embarque: EmbarqueParaRank,
): Promise<{
  origem_latitude?: number;
  origem_longitude?: number;
  destino_latitude?: number;
  destino_longitude?: number;
} | null> {
  const origem_latitude = numeroOpcional(embarque.origem_latitude);
  const origem_longitude = numeroOpcional(embarque.origem_longitude);
  const destino_latitude = numeroOpcional(embarque.destino_latitude);
  const destino_longitude = numeroOpcional(embarque.destino_longitude);

  if (origem_latitude != null && origem_longitude != null) {
    return {
      origem_latitude,
      origem_longitude,
      destino_latitude,
      destino_longitude,
    };
  }

  const rotaId = Number(embarque.config_rota_id);
  if (!Number.isFinite(rotaId) || rotaId <= 0) return null;

  const rotas = await directus.request(
    readItems('config_rotas', {
      filter: { id: { _eq: rotaId } },
      fields: [
        'id',
        'origem_latitude',
        'origem_longitude',
        'destino_latitude',
        'destino_longitude',
      ],
      limit: 1,
    }),
  );

  const rota = rotas[0] as {
    origem_latitude?: number | string | null;
    origem_longitude?: number | string | null;
    destino_latitude?: number | string | null;
    destino_longitude?: number | string | null;
  } | undefined;

  if (!rota) return null;

  return {
    origem_latitude: numeroOpcional(rota.origem_latitude),
    origem_longitude: numeroOpcional(rota.origem_longitude),
    destino_latitude: numeroOpcional(rota.destino_latitude),
    destino_longitude: numeroOpcional(rota.destino_longitude),
  };
}

export async function rankMotoristasParaEmbarque(
  embarque: EmbarqueParaRank,
  limite = 10,
): Promise<MatchingScore[]> {
  const limiteFinal = Math.max(1, limite);
  const operacaoEmbarque = normalizarOperacao(embarque.operacao);
  const [disponibilidades, rotaCoords] = await Promise.all([
    directus.request(
      readItems('disponivel', {
        fields: [
          'id',
          'motorista_id.id',
          'motorista_id.nome',
          'motorista_id.sobrenome',
          'motorista_id.telefone',
          'motorista_id.cidade',
          'motorista_id.estado',
          'motorista_id.tipo_rota',
          'motorista_id.status',
          'disponivel',
          'status',
          'localizacao_atual',
          'local_disponibilidade',
          'latitude',
          'longitude',
          'data_previsao_disponibilidade',
          'date_updated',
          'date_created',
        ],
        sort: ['-date_updated', '-date_created'],
        limit: -1,
      }),
    ),
    obterCoordenadasRota(embarque),
  ]);

  const dispMap = new Map<number, (typeof disponibilidades)[0]>();
  for (const disp of disponibilidades) {
    const mId =
      typeof disp.motorista_id === 'object'
        ? (disp.motorista_id as { id?: number })?.id
        : disp.motorista_id;
    if (mId && !dispMap.has(mId)) {
      dispMap.set(mId, disp);
    }
  }

  const melhores: MatchingScore[] = [];

  for (const disp of dispMap.values()) {
    const motorista = (disp.motorista_id ?? {}) as {
      id?: number | string;
      nome?: string;
      sobrenome?: string;
      telefone?: string;
      cidade?: string;
      estado?: string;
      tipo_rota?: string;
      status?: string;
    };
    if (!motorista.id || String(motorista.status ?? '').toLowerCase() !== 'active') {
      continue;
    }
    if (!statusElegivelDisponibilidade(disp as Record<string, unknown>)) {
      continue;
    }

    const operacoesElegiveis = extrairOperacoesElegiveis(motorista.tipo_rota);
    if (operacaoEmbarque && !operacoesElegiveis.includes(operacaoEmbarque)) {
      continue;
    }
    const motoristaData = {
      id: String(motorista.id),
      nome: `${motorista.nome} ${motorista.sobrenome || ''}`.trim(),
      localizacao_atual: disp?.localizacao_atual || `${motorista.cidade}, ${motorista.estado}`,
      localizacao_prevista: disp?.local_disponibilidade || undefined,
      latitude: numeroOpcional(disp?.latitude),
      longitude: numeroOpcional(disp?.longitude),
      status: disp?.status || 'indisponivel',
      disponivel_em:
        typeof disp?.data_previsao_disponibilidade === 'string'
          ? disp.data_previsao_disponibilidade
          : undefined,
      data_ultima_atualizacao:
        typeof disp?.date_updated === 'string'
          ? disp.date_updated
          : typeof disp?.date_created === 'string'
            ? disp.date_created
            : undefined,
      tipo_veiculo: 'Carreta',
      capacidade_kg: 30000,
      historico_rotas: [],
      viagens_concluidas: 0,
      taxa_aceite: 85,
      gr_aprovada: true,
      operacoes_elegiveis: operacoesElegiveis,
    };

    const embarqueData = {
      id: String(embarque.id),
      origin: embarque.origin || '',
      destination: embarque.destination || '',
      config_rota_id: numeroOpcional(embarque.config_rota_id) ?? null,
      origem_latitude: rotaCoords?.origem_latitude,
      origem_longitude: rotaCoords?.origem_longitude,
      destino_latitude: rotaCoords?.destino_latitude,
      destino_longitude: rotaCoords?.destino_longitude,
      produto_predominante: embarque.produto_predominante || embarque.operacao || '',
      tipo_carga: embarque.tipo_carga || 'geral',
      peso_total: embarque.peso_total ?? undefined,
      valor_frete: embarque.total_value ?? undefined,
      data_coleta: embarque.pickup_date || embarque.created_at || new Date().toISOString(),
      urgencia: 'media' as const,
    };

    const score = calcularMatchingScore(embarqueData, motoristaData);
    score.justificativa.equipamento = operacaoEmbarque
      ? `Elegivel para a operacao ${operacaoEmbarque}${operacoesElegiveis.length ? ` · cadastro: ${operacoesElegiveis.join(', ')}` : ''}`
      : score.justificativa.equipamento;
    inserirTopRanking(melhores, score, limiteFinal);
  }

  return melhores;
}

/** Busca telefone do motorista no Directus */
export async function obterTelefoneMotorista(motoristaId: string): Promise<string | null> {
  const rows = await directus.request(
    readItems('cadastro_motorista', {
      filter: { id: { _eq: motoristaId } },
      fields: ['telefone'],
      limit: 1,
    }),
  );
  const tel = rows[0]?.telefone;
  return tel ? String(tel).replace(/\D/g, '') : null;
}
