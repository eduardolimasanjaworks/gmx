/**
 * Helpers pequenos para selecao manual de rota na oferta.
 * Reutiliza config_rotas real para evitar tabela paralela ou mock.
 * Mantem origem, destino e faixa comercial sempre coerentes no disparo.
 */
import type { ConfigRota } from '@/hooks/useConfigRotas';

interface EmbarqueBaseOferta {
  config_rota_id?: number | null;
  origin: string;
  destination: string;
  operacao?: string;
  valor_ofertado?: number;
  valor_minimo?: number;
  valor_maximo?: number;
}

export interface OfertaManualResolvida {
  configRotaId: number | null;
  origem: string;
  destino: string;
  operacao?: string;
  valorMinimo?: number;
  valorMaximo?: number;
  valorOfertado: number;
}

function norm(valor: string | null | undefined): string {
  return String(valor || '').trim().toLowerCase();
}

function num(valor: unknown): number | undefined {
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function listarRotasCompativeis(
  rotas: ConfigRota[],
  embarque: EmbarqueBaseOferta | null,
): ConfigRota[] {
  if (!embarque) return [];
  const origem = norm(embarque.origin);
  const destino = norm(embarque.destination);
  const operacao = norm(embarque.operacao);
  const atual = Number(embarque.config_rota_id);

  return [...rotas]
    .filter((rota) => rota.ativo !== false)
    .sort((a, b) => {
      const score = (rota: ConfigRota) =>
        (Number(rota.id) === atual ? 100 : 0) +
        (norm(rota.origem) === origem ? 10 : 0) +
        (norm(rota.destino) === destino ? 10 : 0) +
        (operacao && norm(rota.operacao) === operacao ? 5 : 0);
      return score(b) - score(a) || a.origem.localeCompare(b.origem) || a.destino.localeCompare(b.destino);
    });
}

export function resolverOfertaManual(
  embarque: EmbarqueBaseOferta | null,
  rotas: ConfigRota[],
  rotaId: number | null,
  valorDigitado?: number | null,
): OfertaManualResolvida | null {
  if (!embarque) return null;
  const rota = rotaId ? rotas.find((item) => Number(item.id) === Number(rotaId)) || null : null;
  const valorMinimo = num(rota?.valor_minimo ?? embarque.valor_minimo);
  const valorMaximo = num(rota?.valor_maximo ?? embarque.valor_maximo);
  const fallbackOferta = num(embarque.valor_ofertado ?? embarque.valor_minimo ?? embarque.valor_maximo) ?? 0;
  const valorOfertado = num(valorDigitado) ?? valorMinimo ?? fallbackOferta;

  return {
    configRotaId: rota?.id ?? (embarque.config_rota_id ?? null),
    origem: rota?.origem || embarque.origin,
    destino: rota?.destino || embarque.destination,
    operacao: rota?.operacao || embarque.operacao,
    valorMinimo,
    valorMaximo,
    valorOfertado,
  };
}
