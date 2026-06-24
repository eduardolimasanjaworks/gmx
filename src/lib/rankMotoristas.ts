/**
 * Ranking de motoristas para um embarque (score 0–100).
 */
import { directus } from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { calcularMatchingScore, type MatchingScore } from '@/lib/matchingAlgorithm';
import { parseRotaRegras } from '@/lib/rotaRegras';

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

type Coords = { lat: number; lng: number };

const CITY_COORDS: Record<string, Coords> = { 'GUARULHOS_SP': { lat: -23.4543, lng: -46.5337 }, 'CAMPINAS_SP': { lat: -22.9099, lng: -47.0626 }, 'SAO PAULO_SP': { lat: -23.5505, lng: -46.6333 }, 'RIO DE JANEIRO_RJ': { lat: -22.9068, lng: -43.1729 }, 'BELO HORIZONTE_MG': { lat: -19.9167, lng: -43.9345 }, 'CURITIBA_PR': { lat: -25.4284, lng: -49.2733 }, 'PORTO ALEGRE_RS': { lat: -30.0346, lng: -51.2177 }, 'GOIANIA_GO': { lat: -16.6869, lng: -49.2648 }, 'BRASILIA_DF': { lat: -15.7939, lng: -47.8828 } };

function normalizarLocalParaChave(local: string): string | null {
  const t = String(local ?? '').replace(/[→]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const m = t.match(/^(.*?)[,/\- ]\s*([A-Z]{2})$/);
  if (!m) return null;
  return `${m[1].trim().replace(/\s+/g, ' ').toUpperCase()}_${m[2].trim().toUpperCase()}`;
}

function coordenadasPorLocal(local?: string | null): Coords | null {
  const chave = local ? normalizarLocalParaChave(local) : null;
  return chave ? (CITY_COORDS[chave] ?? null) : null;
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
  evidencia?: string | null;
  preferencia_proximidade?: 'agora' | 'coleta' | null;
  gps_max_horas?: number | string | null;
  passo_negociacao_modo?: 'proporcional' | 'fixo' | null;
  passo_negociacao_valor?: number | string | null;
  escalar_humano_no_teto?: boolean | null;
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
        'evidencia',
        'preferencia_proximidade',
        'gps_max_horas',
        'passo_negociacao_modo',
        'passo_negociacao_valor',
        'escalar_humano_no_teto',
      ],
      limit: 1,
    }),
  );

  const rota = rotas[0] as {
    origem_latitude?: number | string | null;
    origem_longitude?: number | string | null;
    destino_latitude?: number | string | null;
    destino_longitude?: number | string | null;
    evidencia?: string | null;
    preferencia_proximidade?: 'agora' | 'coleta' | null;
    gps_max_horas?: number | string | null;
    passo_negociacao_modo?: 'proporcional' | 'fixo' | null;
    passo_negociacao_valor?: number | string | null;
    escalar_humano_no_teto?: boolean | null;
  } | undefined;

  if (!rota) return null;

  return {
    origem_latitude: numeroOpcional(rota.origem_latitude),
    origem_longitude: numeroOpcional(rota.origem_longitude),
    destino_latitude: numeroOpcional(rota.destino_latitude),
    destino_longitude: numeroOpcional(rota.destino_longitude),
    evidencia: rota.evidencia ?? null,
    preferencia_proximidade: rota.preferencia_proximidade ?? null,
    gps_max_horas: rota.gps_max_horas ?? null,
    passo_negociacao_modo: rota.passo_negociacao_modo ?? null,
    passo_negociacao_valor: rota.passo_negociacao_valor ?? null,
    escalar_humano_no_teto: rota.escalar_humano_no_teto ?? null,
  };
}

export async function rankMotoristasParaEmbarque(
  embarque: EmbarqueParaRank,
  limite = 10,
): Promise<MatchingScore[]> {
  const limiteFinal = Math.max(1, limite);
  const operacaoEmbarque = normalizarOperacao(embarque.operacao);
  const dataColeta = new Date(embarque.pickup_date || embarque.created_at || new Date().toISOString());
  const dataColetaOk = !Number.isNaN(dataColeta.getTime());
  const [disponibilidades, rotaCoords] = await Promise.all([
    directus.request(
      readItems('disponivel', {
        fields: [
          'id',
          'motorista_id',
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
          'local_destino_atual',
          'local_liberacao_prevista',
          'latitude',
          'longitude',
          'local_liberacao_prevista_latitude',
          'local_liberacao_prevista_longitude',
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
  const motoristaIdsFaltantes = new Set<number>();
  for (const disp of disponibilidades) {
    const mId =
      typeof disp.motorista_id === 'object'
        ? (disp.motorista_id as { id?: number })?.id
        : Number(disp.motorista_id);
    if (mId && !dispMap.has(mId)) {
      dispMap.set(mId, disp);
    }
    if (Number.isFinite(Number(mId)) && typeof disp.motorista_id !== 'object') {
      motoristaIdsFaltantes.add(Number(mId));
    }
  }

  const motoristasFallback = motoristaIdsFaltantes.size
    ? await directus.request(
        readItems('cadastro_motorista', {
          filter: { id: { _in: Array.from(motoristaIdsFaltantes) } },
          fields: ['id', 'nome', 'sobrenome', 'telefone', 'cidade', 'estado', 'tipo_rota', 'status'],
          limit: -1,
        }),
      )
    : [];
  const fallbackMap = new Map<number, (typeof motoristasFallback)[0]>();
  for (const motorista of motoristasFallback) {
    fallbackMap.set(Number(motorista.id), motorista);
  }

  const melhores: MatchingScore[] = [];

  for (const disp of dispMap.values()) {
    const motoristaIdRaw =
      typeof disp.motorista_id === 'object'
        ? Number((disp.motorista_id as { id?: number })?.id)
        : Number(disp.motorista_id);
    const motorista = ((typeof disp.motorista_id === 'object' ? disp.motorista_id : null) ??
      fallbackMap.get(motoristaIdRaw) ??
      {}) as {
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
    const coordsAtual = coordenadasPorLocal(String(disp?.localizacao_atual ?? `${motorista.cidade}, ${motorista.estado}`));
    const localLiberacaoPrevista =
      typeof disp?.local_liberacao_prevista === 'string' && disp.local_liberacao_prevista.trim()
        ? disp.local_liberacao_prevista
        : disp?.local_disponibilidade;
    const motoristaData = {
      id: String(motorista.id),
      nome: `${motorista.nome} ${motorista.sobrenome || ''}`.trim(),
      localizacao_atual: disp?.localizacao_atual || `${motorista.cidade}, ${motorista.estado}`,
      localizacao_prevista: localLiberacaoPrevista || undefined,
      latitude: numeroOpcional(disp?.latitude) ?? coordsAtual?.lat,
      longitude: numeroOpcional(disp?.longitude) ?? coordsAtual?.lng,
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

    const dispEmRaw =
      typeof disp?.data_previsao_disponibilidade === 'string'
        ? disp.data_previsao_disponibilidade
        : null;
    const dispEm = dispEmRaw ? new Date(dispEmRaw) : null;
    const dispEmOk = dispEm != null && !Number.isNaN(dispEm.getTime());

    if (
      dataColetaOk &&
      dispEmOk &&
      dataColeta.getTime() >= (dispEm as Date).getTime() &&
      typeof localLiberacaoPrevista === 'string' &&
      localLiberacaoPrevista.trim()
    ) {
      const coordsPrev = {
        lat:
          numeroOpcional((disp as Record<string, unknown>)?.local_liberacao_prevista_latitude) ??
          coordenadasPorLocal(localLiberacaoPrevista)?.lat,
        lng:
          numeroOpcional((disp as Record<string, unknown>)?.local_liberacao_prevista_longitude) ??
          coordenadasPorLocal(localLiberacaoPrevista)?.lng,
      };
      if (Number.isFinite(coordsPrev.lat) && Number.isFinite(coordsPrev.lng)) {
        motoristaData.latitude = coordsPrev.lat;
        motoristaData.longitude = coordsPrev.lng;
        motoristaData.data_ultima_atualizacao = dispEmRaw ?? motoristaData.data_ultima_atualizacao;
      }
    }

    const regras = parseRotaRegras(
      rotaCoords
        ? {
            evidencia: rotaCoords.evidencia ?? null,
            preferencia_proximidade: rotaCoords.preferencia_proximidade ?? null,
            gps_max_horas: numeroOpcional(rotaCoords.gps_max_horas),
            passo_negociacao_modo: rotaCoords.passo_negociacao_modo ?? null,
            passo_negociacao_valor: numeroOpcional(rotaCoords.passo_negociacao_valor),
            escalar_humano_no_teto: rotaCoords.escalar_humano_no_teto ?? null,
          }
        : undefined,
    );
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
      preferencia_proximidade: regras.preferencia_proximidade,
      gps_max_horas: regras.gps_max_horas,
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
