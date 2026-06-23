/**
 * Disparo de oferta via iagmx → Evolution (texto fixo ERP).
 */
import { updateEmbarque } from '@/lib/embarques';

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

  const linhas = [
    'Adriano - GMX / CargoX',
    '',
    `Temos carga ${input.origem} → ${input.destino}`,
  ];
  if (input.produto?.trim()) linhas.push(`Produto: ${input.produto.trim()}`);
  if (input.operacao?.trim()) linhas.push(`Operação: ${input.operacao.trim()}`);
  linhas.push(`Valor: ${valorFmt}`, '', 'Tem interesse?');
  return linhas.join('\n');
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
