import { describe, expect, it } from 'vitest';
import { parseRotaRegras, stringifyRotaRegras } from './rotaRegras';

describe('rotaRegras', () => {
  it('serializa e faz parse das regras operacionais', () => {
    const raw = stringifyRotaRegras({
      preferencia_proximidade: 'coleta',
      gps_max_horas: 18,
      passo_negociacao_modo: 'fixo',
      passo_negociacao_valor: 250,
      escalar_humano_no_teto: true,
    });

    expect(parseRotaRegras({ evidencia: raw })).toEqual({
      preferencia_proximidade: 'coleta',
      gps_max_horas: 18,
      passo_negociacao_modo: 'fixo',
      passo_negociacao_valor: 250,
      escalar_humano_no_teto: true,
    });
  });

  it('prioriza campos reais da rota sobre o legado em evidencia', () => {
    const raw = stringifyRotaRegras({
      preferencia_proximidade: 'agora',
      gps_max_horas: 12,
      passo_negociacao_modo: 'fixo',
      passo_negociacao_valor: 500,
      escalar_humano_no_teto: false,
    });

    expect(
      parseRotaRegras({
        evidencia: raw,
        preferencia_proximidade: 'coleta',
        gps_max_horas: 24,
        passo_negociacao_modo: 'proporcional',
        passo_negociacao_valor: 100,
        escalar_humano_no_teto: true,
      }),
    ).toEqual({
      preferencia_proximidade: 'coleta',
      gps_max_horas: 24,
      passo_negociacao_modo: 'proporcional',
      passo_negociacao_valor: 100,
      escalar_humano_no_teto: true,
    });
  });
});
