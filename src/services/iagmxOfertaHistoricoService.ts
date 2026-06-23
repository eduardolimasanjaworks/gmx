const IAGMX_URL = (
  import.meta.env.VITE_IAGMX_URL || 'https://iagmx.sanjaworks.com'
).replace(/\/$/, '');

const IAGMX_KEY = import.meta.env.VITE_IAGMX_ADMIN_KEY || 'iagmx-pausa-2026';

export interface HistoricoOfertaNominalItem {
  id: number;
  evento_id?: string | null;
  data?: string | null;
  telefone?: string | null;
  motorista_id?: number | null;
  motorista_nome?: string | null;
  origem?: string | null;
  destino?: string | null;
  subtipo?: string | null;
  motivo?: string | null;
  observacao?: string | null;
  valor_ofertado?: number | null;
  valor_aceito?: number | null;
  valor_pedido_motorista?: number | null;
}

export interface HistoricoOfertaNominalResumo {
  embarque_id: string;
  recusas: HistoricoOfertaNominalItem[];
  escalonamentos: HistoricoOfertaNominalItem[];
  aceites: HistoricoOfertaNominalItem[];
}

export async function obterHistoricoNominalOferta(
  embarqueId: string | number,
): Promise<HistoricoOfertaNominalResumo> {
  const res = await fetch(
    `${IAGMX_URL}/api/admin/ofertas/historico-nominal?embarque_id=${encodeURIComponent(String(embarqueId))}`,
    {
      headers: {
        'x-iagmx-key': IAGMX_KEY,
      },
    },
  );
  const body = (await res.json().catch(() => ({}))) as HistoricoOfertaNominalResumo & { erro?: string };
  if (!res.ok) {
    throw new Error(body.erro || `Falha ao carregar historico nominal (${res.status})`);
  }
  return body;
}
