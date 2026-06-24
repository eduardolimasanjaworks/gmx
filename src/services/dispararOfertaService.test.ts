import { afterEach, describe, expect, it, vi } from 'vitest';

const updateEmbarqueMock = vi.fn();

vi.mock('@/lib/embarques', () => ({
  updateEmbarque: updateEmbarqueMock,
}));

import { dispararOfertaIagmx, montarPreviewMensagemOferta } from './dispararOfertaService';

describe('dispararOfertaService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
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

  it('nao grava driver_id no patch otimista ao disparar oferta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, enviado: true }),
      }),
    );

    await dispararOfertaIagmx({
      embarqueId: 321,
      motoristaId: '77',
      telefone: '5511999998888',
      origem: 'Guarulhos SP',
      destino: 'Curitiba PR',
      valorOfertado: 4500,
    });

    expect(updateEmbarqueMock).toHaveBeenCalledTimes(1);
    expect(updateEmbarqueMock).toHaveBeenCalledWith(
      '321',
      expect.objectContaining({
        status: 'sent',
        oferta_motorista_id: 77,
        valor_ofertado: 4500,
      }),
    );
    expect(updateEmbarqueMock.mock.calls[0]?.[1]).not.toHaveProperty('driver_id');
  });
});
