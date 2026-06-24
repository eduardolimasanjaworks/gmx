import { describe, expect, it } from 'vitest';
import {
  CSV_IGNORE,
  inferirCsvColumnMapping,
  mapCsvRowsToEmbarques,
  mappingObrigatorioValido,
} from './csvEmbarqueMapping';

describe('csvEmbarqueMapping', () => {
  it('infere colunas conhecidas e valida obrigatorios', () => {
    const mapping = inferirCsvColumnMapping([
      'Origem',
      'Destino',
      'Cliente',
      'Valor Total',
      'Tipo de Veiculo',
    ]);

    expect(mapping.origem).toBe('Origem');
    expect(mapping.destino).toBe('Destino');
    expect(mapping.cliente).toBe('Cliente');
    expect(mapping.total_value).toBe('Valor Total');
    expect(mappingObrigatorioValido(mapping)).toBe(true);
  });

  it('mapeia linhas arbitrarias para embarque com colunas escolhidas manualmente', () => {
    const rows = [
      {
        CidadeOrigem: 'Guarulhos/SP',
        CidadeDestino: 'Curitiba/PR',
        OperacaoCsv: 'ARROZ',
        ValorFrete: '4.500,00',
      },
    ];

    const mapping = inferirCsvColumnMapping(['CidadeOrigem', 'CidadeDestino', 'OperacaoCsv', 'ValorFrete']);
    mapping.origem = 'CidadeOrigem';
    mapping.destino = 'CidadeDestino';
    mapping.operacao = 'OperacaoCsv';
    mapping.total_value = 'ValorFrete';
    mapping.pedido = CSV_IGNORE;

    expect(mapCsvRowsToEmbarques(rows, mapping)).toEqual([
      expect.objectContaining({
        origem: 'Guarulhos/SP',
        destino: 'Curitiba/PR',
        operacao: 'ARROZ',
        total_value: '4.500,00',
      }),
    ]);
  });
});
