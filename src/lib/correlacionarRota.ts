/**
 * Correlaciona origem/destino/operação de um embarque com config_rotas.
 */
import type { ConfigRota } from '@/hooks/useConfigRotas';

export type RotaStatus = 'correlacionada' | 'pendente' | 'manual';

export function normalizarTextoRota(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Match por rota e operação exata normalizada. */
export function buscarRotaNaLista(
  opts: { origem: string; destino: string; operacao?: string },
  rotas: ConfigRota[],
): ConfigRota | null {
  const o = normalizarTextoRota(opts.origem);
  const d = normalizarTextoRota(opts.destino);
  const op = opts.operacao ? normalizarTextoRota(opts.operacao) : '';

  if (!o || !d) return null;

  const ativas = rotas.filter((r) => r.ativo !== false);
  const match = ativas.find((r) => {
    const ro = normalizarTextoRota(r.origem);
    const rd = normalizarTextoRota(r.destino);
    const rop = r.operacao ? normalizarTextoRota(r.operacao) : '';
    const origemOk = ro.includes(o) || o.includes(ro);
    const destinoOk = rd.includes(d) || d.includes(rd);
    const opOk = !op || !rop || rop === op;
    return origemOk && destinoOk && opOk;
  });

  return match ?? null;
}

export function camposEmbarqueDaRota(
  rota: ConfigRota,
  valorOfertado?: number | null,
  rotaStatus: RotaStatus = 'correlacionada',
): Record<string, unknown> {
  const min = Number(rota.valor_minimo);
  const max = Number(rota.valor_maximo);
  const oferta =
    valorOfertado != null && Number.isFinite(valorOfertado) ? valorOfertado : min;

  return {
    config_rota_id: rota.id,
    rota_status: rotaStatus,
    operacao: rota.operacao ?? null,
    valor_minimo: min,
    valor_maximo: max,
    valor_ofertado: oferta,
  };
}
