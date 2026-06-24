/**
 * Regras operacionais embutidas na rota sem depender de schema novo.
 * Persistimos no campo textual existente com prefixo estável e parse seguro.
 * Isso permite evoluir matching e negociação com rollout progressivo.
 */
export type PreferenciaProximidade = 'agora' | 'coleta';
export type PassoNegociacaoModo = 'proporcional' | 'fixo';

export interface RotaRegrasOperacionais {
  preferencia_proximidade?: PreferenciaProximidade;
  gps_max_horas?: number;
  passo_negociacao_modo?: PassoNegociacaoModo;
  passo_negociacao_valor?: number;
}

const PREFIXO = 'GMX_RULES::';

export function parseRotaRegras(raw?: string | null): RotaRegrasOperacionais {
  const texto = String(raw ?? '').trim();
  if (!texto.startsWith(PREFIXO)) return {};
  try {
    const parsed = JSON.parse(texto.slice(PREFIXO.length)) as RotaRegrasOperacionais;
    return {
      preferencia_proximidade:
        parsed.preferencia_proximidade === 'agora' ? 'agora' : parsed.preferencia_proximidade === 'coleta' ? 'coleta' : undefined,
      gps_max_horas:
        Number.isFinite(Number(parsed.gps_max_horas)) && Number(parsed.gps_max_horas) > 0
          ? Number(parsed.gps_max_horas)
          : undefined,
      passo_negociacao_modo:
        parsed.passo_negociacao_modo === 'fixo' ? 'fixo' : parsed.passo_negociacao_modo === 'proporcional' ? 'proporcional' : undefined,
      passo_negociacao_valor:
        Number.isFinite(Number(parsed.passo_negociacao_valor)) && Number(parsed.passo_negociacao_valor) > 0
          ? Number(parsed.passo_negociacao_valor)
          : undefined,
    };
  } catch {
    return {};
  }
}

export function stringifyRotaRegras(regras: RotaRegrasOperacionais): string {
  const payload: RotaRegrasOperacionais = {};
  if (regras.preferencia_proximidade) payload.preferencia_proximidade = regras.preferencia_proximidade;
  if (Number.isFinite(Number(regras.gps_max_horas)) && Number(regras.gps_max_horas) > 0) payload.gps_max_horas = Number(regras.gps_max_horas);
  if (regras.passo_negociacao_modo) payload.passo_negociacao_modo = regras.passo_negociacao_modo;
  if (Number.isFinite(Number(regras.passo_negociacao_valor)) && Number(regras.passo_negociacao_valor) > 0) payload.passo_negociacao_valor = Number(regras.passo_negociacao_valor);
  return `${PREFIXO}${JSON.stringify(payload)}`;
}

