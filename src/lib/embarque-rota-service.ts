/**
 * Fase 2 — correlacionar embarque ↔ config_rotas + auditoria.
 */
import { directus } from '@/lib/directus';
import { createItem, createItems, readItems, updateItem } from '@directus/sdk';
import type { ConfigRota } from '@/hooks/useConfigRotas';
import {
  buscarRotaNaLista,
  camposEmbarqueDaRota,
  type RotaStatus,
} from '@/lib/correlacionarRota';

export interface CsvEmbarqueRow {
  pedido?: string;
  origem: string;
  destino: string;
  uf?: string;
  cliente?: string;
  tp?: string;
  produto?: string;
  operacao?: string;
  paletes?: string | number;
  quantidade_kg?: string | number;
  total_value?: string | number;
  tipo_veiculo?: string;
  placa_cavalo?: string;
  pickup_date?: string;
  delivery_date?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
}

export type AcaoRotaLog =
  | 'correlacao_automatica'
  | 'correlacao_manual'
  | 'rota_criada_e_associada'
  | 'sem_rota';

export async function listarRotasAtivas(): Promise<ConfigRota[]> {
  const rows = await directus.request(
    readItems('config_rotas', {
      filter: { ativo: { _eq: true } },
      limit: -1,
      sort: ['origem', 'destino'],
    }),
  );
  return rows as ConfigRota[];
}

export async function registrarEmbarqueRotaLog(opts: {
  embarqueId: number;
  acao: AcaoRotaLog;
  configRotaIdAntes?: number | null;
  configRotaIdDepois?: number | null;
  usuario?: string;
  detalhes?: Record<string, unknown>;
}): Promise<void> {
  try {
    await directus.request(
      createItem('embarque_rota_log', {
        embarque_id: opts.embarqueId,
        acao: opts.acao,
        config_rota_id_antes: opts.configRotaIdAntes ?? null,
        config_rota_id_depois: opts.configRotaIdDepois ?? null,
        usuario: opts.usuario ?? 'sistema',
        detalhes: opts.detalhes ?? null,
      }),
    );
  } catch (err) {
    console.warn('[embarque-rota] log auditoria falhou (coleção existe?):', err);
  }
}

export interface ResultadoCorrelacao {
  rota: ConfigRota | null;
  rotaStatus: RotaStatus;
  campos: Record<string, unknown>;
}

export function resolverCorrelacao(
  origin: string,
  destination: string,
  rotas: ConfigRota[],
  opts?: { operacao?: string; valorOfertado?: number | null; rotaIdManual?: number },
): ResultadoCorrelacao {
  let rota: ConfigRota | null = null;
  let rotaStatus: RotaStatus = 'pendente';

  if (opts?.rotaIdManual) {
    rota = rotas.find((r) => r.id === opts.rotaIdManual) ?? null;
    rotaStatus = rota ? 'manual' : 'pendente';
  } else {
    rota = buscarRotaNaLista(
      { origem: origin, destino: destination, operacao: opts?.operacao },
      rotas,
    );
    rotaStatus = rota ? 'correlacionada' : 'pendente';
  }

  const campos = rota
    ? camposEmbarqueDaRota(rota, opts?.valorOfertado, rotaStatus)
    : { rota_status: 'pendente' as const };

  return { rota, rotaStatus, campos };
}

/** Atualiza embarque existente com rota + log */
export async function correlacionarEAtualizarEmbarque(
  embarqueId: number,
  origin: string,
  destination: string,
  opts?: {
    operacao?: string;
    valorOfertado?: number | null;
    usuario?: string;
    rotaIdManual?: number;
    configRotaIdAntes?: number | null;
  },
): Promise<ResultadoCorrelacao> {
  const rotas = await listarRotasAtivas();
  const resultado = resolverCorrelacao(origin, destination, rotas, opts);

  await directus.request(updateItem('embarques', embarqueId, resultado.campos));

  await registrarEmbarqueRotaLog({
    embarqueId,
    acao: opts?.rotaIdManual
      ? 'correlacao_manual'
      : resultado.rota
        ? 'correlacao_automatica'
        : 'sem_rota',
    configRotaIdAntes: opts?.configRotaIdAntes ?? null,
    configRotaIdDepois: resultado.rota?.id ?? null,
    usuario: opts?.usuario,
    detalhes: { origin, destination, operacao: opts?.operacao },
  });

  return resultado;
}

/** Cria embarques a partir de linhas CSV e tenta correlacionar cada um */
export async function criarEmbarquesDoCsv(
  rows: CsvEmbarqueRow[],
  opts?: { usuario?: string; defaultOperacao?: string; rotaIdManual?: number },
): Promise<{ total: number; correlacionados: number; pendentes: number }> {
  const rotas = await listarRotasAtivas();
  let correlacionados = 0;
  let pendentes = 0;

  for (const row of rows) {
    if (!row.origem?.trim() || !row.destino?.trim()) {
      pendentes++;
      continue;
    }

    const operacaoEfetiva =
      row.operacao?.trim() || opts?.defaultOperacao?.trim() || inferirOperacao(row.produto);
    const resultado = resolverCorrelacao(row.origem, row.destino, rotas, {
      operacao: operacaoEfetiva,
      rotaIdManual: opts?.rotaIdManual,
    });

    const embarque = (await directus.request(
      createItem('embarques', {
        origin: row.origem.trim(),
        destination: row.destino.trim(),
        produto_predominante: row.produto?.trim() || null,
        cargo_type: row.produto?.trim() || null,
        operacao: operacaoEfetiva || null,
        tipo_veiculo: row.tipo_veiculo?.trim() || null,
        placa_cavalo: row.placa_cavalo?.trim() || null,
        quantidade_kg: numeroOpcional(row.quantidade_kg),
        total_value: numeroOpcional(row.total_value),
        pickup_date: row.pickup_date?.trim() || null,
        delivery_date: row.delivery_date?.trim() || null,
        delivery_window_start: row.delivery_window_start?.trim() || null,
        delivery_window_end: row.delivery_window_end?.trim() || null,
        status: 'new',
        email_content: [
          row.pedido && `Pedido: ${row.pedido}`,
          row.cliente && `Cliente: ${row.cliente}`,
          row.tp && `TP: ${row.tp}`,
          row.paletes && `Paletes: ${row.paletes}`,
          row.quantidade_kg && `Quantidade kg: ${row.quantidade_kg}`,
        ]
          .filter(Boolean)
          .join(' | '),
        ...resultado.campos,
      }),
    )) as { id: number };

    if (resultado.rota) correlacionados++;
    else pendentes++;

    await registrarEmbarqueRotaLog({
      embarqueId: embarque.id,
      acao: opts?.rotaIdManual
        ? 'correlacao_manual'
        : resultado.rota
          ? 'correlacao_automatica'
          : 'sem_rota',
      configRotaIdDepois: resultado.rota?.id ?? null,
      usuario: opts?.usuario,
      detalhes: {
        origem: row.origem,
        destino: row.destino,
        pedido: row.pedido,
        operacao: operacaoEfetiva,
        rotaIdManual: opts?.rotaIdManual ?? null,
      },
    });
  }

  return { total: rows.length, correlacionados, pendentes };
}

/** Importação em lote (follow collection) — mantém compatibilidade */
export async function importarFollowBatch(
  payload: Record<string, unknown>[],
): Promise<unknown> {
  return directus.request(createItems('follow', payload));
}

function inferirOperacao(produto?: string): string | undefined {
  if (!produto) return undefined;
  const p = produto.toLowerCase();
  if (p.includes('arroz')) return 'ARROZ';
  if (p.includes('lata') || p.includes('latinha')) return 'LATA';
  if (p.includes('malte')) return 'MALTE';
  return undefined;
}

function numeroOpcional(valor?: string | number): number | null {
  if (valor == null || String(valor).trim() === '') return null;
  const normalizado = String(valor).replace(/\./g, '').replace(',', '.').trim();
  const num = Number(normalizado);
  return Number.isFinite(num) ? num : null;
}
