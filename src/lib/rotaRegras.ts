/**
 * Leitura e normalizacao das regras operacionais da rota.
 * Prioriza colunas reais do Directus e aceita legado em `evidencia`.
 * A migracao fica compatível sem perder auditabilidade.
 */
export type PreferenciaProximidade = 'agora' | 'coleta';
export type PassoNegociacaoModo = 'proporcional' | 'fixo';

export interface RotaRegrasOperacionais {
  preferencia_proximidade?: PreferenciaProximidade;
  gps_max_horas?: number;
  passo_negociacao_modo?: PassoNegociacaoModo;
  passo_negociacao_valor?: number;
  escalar_humano_no_teto?: boolean;
}

const PREFIXO = 'GMX_RULES::';

export type RotaRegrasSource = RotaRegrasOperacionais & {
  evidencia?: string | null;
};

export function parseRotaRegrasLegado(raw?: string | null): RotaRegrasOperacionais {
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
      escalar_humano_no_teto:
        parsed.escalar_humano_no_teto === false ? false : parsed.escalar_humano_no_teto === true ? true : undefined,
    };
  } catch {
    return {};
  }
}

export function parseRotaRegras(source?: RotaRegrasSource | null): RotaRegrasOperacionais {
  const legado = parseRotaRegrasLegado(source?.evidencia);
  return {
    preferencia_proximidade:
      source?.preferencia_proximidade === 'agora'
        ? 'agora'
        : source?.preferencia_proximidade === 'coleta'
          ? 'coleta'
          : legado.preferencia_proximidade,
    gps_max_horas:
      Number.isFinite(Number(source?.gps_max_horas)) && Number(source?.gps_max_horas) > 0
        ? Number(source?.gps_max_horas)
        : legado.gps_max_horas,
    passo_negociacao_modo:
      source?.passo_negociacao_modo === 'fixo'
        ? 'fixo'
        : source?.passo_negociacao_modo === 'proporcional'
          ? 'proporcional'
          : legado.passo_negociacao_modo,
    passo_negociacao_valor:
      Number.isFinite(Number(source?.passo_negociacao_valor)) && Number(source?.passo_negociacao_valor) > 0
        ? Number(source?.passo_negociacao_valor)
        : legado.passo_negociacao_valor,
    escalar_humano_no_teto:
      source?.escalar_humano_no_teto === false
        ? false
        : source?.escalar_humano_no_teto === true
          ? true
          : legado.escalar_humano_no_teto,
  };
}

export function stringifyRotaRegras(regras: RotaRegrasOperacionais): string {
  const payload: RotaRegrasOperacionais = {};
  if (regras.preferencia_proximidade) payload.preferencia_proximidade = regras.preferencia_proximidade;
  if (Number.isFinite(Number(regras.gps_max_horas)) && Number(regras.gps_max_horas) > 0) payload.gps_max_horas = Number(regras.gps_max_horas);
  if (regras.passo_negociacao_modo) payload.passo_negociacao_modo = regras.passo_negociacao_modo;
  if (Number.isFinite(Number(regras.passo_negociacao_valor)) && Number(regras.passo_negociacao_valor) > 0) payload.passo_negociacao_valor = Number(regras.passo_negociacao_valor);
  if (typeof regras.escalar_humano_no_teto === 'boolean') payload.escalar_humano_no_teto = regras.escalar_humano_no_teto;
  return `${PREFIXO}${JSON.stringify(payload)}`;
}
