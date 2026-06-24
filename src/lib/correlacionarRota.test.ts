import { describe, expect, it } from 'vitest';
import { buscarRotaNaLista, camposEmbarqueDaRota } from './correlacionarRota';

describe('correlacionarRota', () => {
  it('usa valor_minimo como valor_ofertado padrão quando não há override', () => {
    const rota = {
      id: 1,
      origem: 'Guarulhos SP',
      destino: 'Curitiba PR',
      valor_minimo: 4200,
      valor_maximo: 5200,
      ativo: true,
    } as any;

    const campos = camposEmbarqueDaRota(rota);
    expect(campos.valor_minimo).toBe(4200);
    expect(campos.valor_maximo).toBe(5200);
    expect(campos.valor_ofertado).toBe(4200);
  });

  it('mantém valor_ofertado quando informado explicitamente', () => {
    const rota = {
      id: 2,
      origem: 'Guarulhos SP',
      destino: 'Curitiba PR',
      valor_minimo: 4000,
      valor_maximo: 5000,
      ativo: true,
    } as any;

    const campos = camposEmbarqueDaRota(rota, 4700);
    expect(campos.valor_ofertado).toBe(4700);
  });

  it('faz correlacao por origem e destino exatos apos normalizacao', () => {
    const rotas = [
      {
        id: 1,
        origem: 'Guarulhos SP',
        destino: 'Curitiba PR',
        operacao: 'ARROZ',
        valor_minimo: 4200,
        valor_maximo: 5200,
        ativo: true,
      },
    ] as any;

    expect(
      buscarRotaNaLista(
        { origem: 'guarulhos sp', destino: 'curitiba pr', operacao: 'arroz' },
        rotas,
      )?.id,
    ).toBe(1);
  });

  it('nao aceita match parcial de cidade ou rota parecida', () => {
    const rotas = [
      {
        id: 1,
        origem: 'Guarulhos SP',
        destino: 'Curitiba PR',
        operacao: 'ARROZ',
        valor_minimo: 4200,
        valor_maximo: 5200,
        ativo: true,
      },
    ] as any;

    expect(
      buscarRotaNaLista(
        { origem: 'Guarulhos', destino: 'Curitiba PR', operacao: 'ARROZ' },
        rotas,
      ),
    ).toBeNull();
  });
});
