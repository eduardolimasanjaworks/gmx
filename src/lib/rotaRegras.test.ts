import { describe, expect, it } from 'vitest';
import { parseRotaRegras, stringifyRotaRegras } from './rotaRegras';

describe('rotaRegras', () => {
  it('serializa e faz parse das regras operacionais', () => {
    const raw = stringifyRotaRegras({
      preferencia_proximidade: 'coleta',
      gps_max_horas: 18,
      passo_negociacao_modo: 'fixo',
      passo_negociacao_valor: 250,
    });

    expect(parseRotaRegras(raw)).toEqual({
      preferencia_proximidade: 'coleta',
      gps_max_horas: 18,
      passo_negociacao_modo: 'fixo',
      passo_negociacao_valor: 250,
    });
  });
});

