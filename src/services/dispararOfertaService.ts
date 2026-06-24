/**
 * Disparo de oferta via iagmx → Evolution (texto fixo ERP).
 */
const IAGMX_URL = (
  import.meta.env.VITE_IAGMX_URL || 'https://iagmx.sanjaworks.com'
).replace(/\/$/, '');

const IAGMX_KEY = import.meta.env.VITE_IAGMX_ADMIN_KEY || 'iagmx-pausa-2026';

export interface DispararOfertaInput {
  embarqueId: string | number;
  configRotaId?: number | null;
  motoristaId: string;
  telefone: string;
  origem: string;
  destino: string;
  valorOfertado: number;
  valorMinimo?: number;
  valorMaximo?: number;
  operacao?: string;
  produto?: string;
}

export interface DispararOfertaResult {
  ok: boolean;
  enviado?: boolean;
  motivo?: string;
  filaId?: string;
}

function saudacaoHorarioAgora(): string {
  const h = new Date().getHours();
  if (h >= 5 && h <= 11) return 'Bom dia';
  if (h >= 12 && h <= 17) return 'Boa tarde';
  return 'Boa noite';
}

export function montarPreviewMensagemOferta(input: {
  origem: string;
  destino: string;
  valorOfertado: number;
  operacao?: string;
  produto?: string;
}): string {
  const valor = Number(input.valorOfertado);
  const valorFmt = Number.isFinite(valor)
    ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : '—';

  const saudacao = saudacaoHorarioAgora();
  const linhas = [
    saudacao,
    '',
    `Temos ${input.origem} → ${input.destino}`,
    `Valor: ${valorFmt}`,
    '',
    'Tem interesse?',
  ];
  return linhas.join('\n').trim();
}

export async function dispararOfertaIagmx(input: DispararOfertaInput): Promise<DispararOfertaResult> {
  const telefone = input.telefone.replace(/\D/g, '');
  const res = await fetch(`${IAGMX_URL}/api/disparar-oferta`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-iagmx-key': IAGMX_KEY,
    },
    body: JSON.stringify({
      telefone,
      embarque_id: input.embarqueId,
      config_rota_id: input.configRotaId,
      origem: input.origem,
      destino: input.destino,
      valor_ofertado: input.valorOfertado,
      valor_minimo: input.valorMinimo,
      valor_maximo: input.valorMaximo,
      operacao: input.operacao,
      produto: input.produto,
      motorista_id: input.motoristaId,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as DispararOfertaResult & { erro?: string };

  if (!res.ok) {
    return {
      ok: false,
      enviado: false,
      motivo: body.motivo || body.erro || `HTTP ${res.status}`,
      filaId: body.filaId,
    };
  }

  if (body.enviado !== false) {
    const { updateEmbarque } = await import('@/lib/embarques');
    await updateEmbarque(String(input.embarqueId), {
      status: 'sent',
      driver_id: parseInt(input.motoristaId, 10),
      oferta_disparada_em: new Date().toISOString(),
      oferta_motorista_id: parseInt(input.motoristaId, 10),
      valor_ofertado: input.valorOfertado,
    });
  }

  return { ok: true, enviado: body.enviado !== false, motivo: body.motivo, filaId: body.filaId };
}
