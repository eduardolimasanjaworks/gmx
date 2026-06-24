import { afterEach, describe, expect, it, vi } from 'vitest';
import { montarPreviewMensagemOferta } from './dispararOfertaService';

describe('dispararOfertaService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('monta preview sem faixa e sem assinatura fixa, usando saudação do horário', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T09:00:00Z'));

    const texto = montarPreviewMensagemOferta({
      origem: 'Guarulhos SP',
      destino: 'Curitiba PR',
      valorOfertado: 4500,
      operacao: 'ARROZ',
      produto: 'ARROZ',
    });

    expect(texto).toContain('Bom dia');
    expect(texto).toContain('Temos Guarulhos SP → Curitiba PR');
    expect(texto).toContain('Valor:');
    expect(texto).not.toContain('Adriano');
    expect(texto).not.toContain('até');
  });
});

