/**
 * Ranking de motoristas para um embarque (score 0–100).
 */
import { directus } from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { calcularMatchingScore, type MatchingScore } from '@/lib/matchingAlgorithm';

export interface EmbarqueParaRank {
  id: string | number;
  origin?: string | null;
  destination?: string | null;
  produto_predominante?: string | null;
  tipo_carga?: string | null;
  peso_total?: number | null;
  total_value?: number | null;
  pickup_date?: string | null;
  created_at?: string | null;
  operacao?: string | null;
}

export async function rankMotoristasParaEmbarque(
  embarque: EmbarqueParaRank,
  limite = 10,
): Promise<MatchingScore[]> {
  const motoristas = await directus.request(
    readItems('cadastro_motorista', {
      fields: ['id', 'nome', 'sobrenome', 'telefone', 'cidade', 'estado'],
      filter: { status: { _eq: 'active' } },
      limit: 150,
    }),
  );

  const disponibilidades = await directus.request(
    readItems('disponivel', {
      fields: ['*'],
      sort: ['-date_created'],
      limit: 2000,
    }),
  );

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

  const scores: MatchingScore[] = [];

  for (const motorista of motoristas) {
    const disp = dispMap.get(motorista.id);
    const motoristaData = {
      id: String(motorista.id),
      nome: `${motorista.nome} ${motorista.sobrenome || ''}`.trim(),
      localizacao_atual: disp?.localizacao_atual || `${motorista.cidade}, ${motorista.estado}`,
      latitude: disp?.latitude,
      longitude: disp?.longitude,
      status: disp?.status || 'indisponivel',
      disponivel_em: disp?.disponivel_em,
      tipo_veiculo: 'Carreta',
      capacidade_kg: 30000,
      historico_rotas: [],
      viagens_concluidas: 0,
      taxa_aceite: 85,
      gr_aprovada: true,
    };

    const embarqueData = {
      id: String(embarque.id),
      origin: embarque.origin || '',
      destination: embarque.destination || '',
      produto_predominante: embarque.produto_predominante || embarque.operacao || '',
      tipo_carga: embarque.tipo_carga || 'geral',
      peso_total: embarque.peso_total ?? undefined,
      valor_frete: embarque.total_value ?? undefined,
      data_coleta: embarque.pickup_date || embarque.created_at || new Date().toISOString(),
      urgencia: 'media' as const,
    };

    scores.push(calcularMatchingScore(embarqueData, motoristaData));
  }

  scores.sort((a, b) => b.score_total - a.score_total);
  return scores.slice(0, limite);
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
