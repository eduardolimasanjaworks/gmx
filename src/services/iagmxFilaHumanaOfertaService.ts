/**
 * Cliente da fila humana de ofertas no IAGMX.
 * O portal consulta, assume e resolve casos escalados sem acessar Redis direto.
 * A API do IAGMX continua sendo a fonte de verdade da orquestracao.
 */
const IAGMX_URL = (
  import.meta.env.VITE_IAGMX_URL || 'https://iagmx.sanjaworks.com'
).replace(/\/$/, '');

const IAGMX_KEY = import.meta.env.VITE_IAGMX_ADMIN_KEY || 'iagmx-pausa-2026';

export interface FilaHumanaOfertaItem {
  id: number;
  embarque_id?: number | string | null;
  motorista_id?: number | string | null;
  telefone?: string | null;
  status?: string | null;
  motivo?: string | null;
  valor_ofertado?: number | null;
  valor_pedido_motorista?: number | null;
  valor_minimo?: number | null;
  valor_maximo?: number | null;
  origem?: string | null;
  destino?: string | null;
  assumido_por?: string | null;
  observacao?: string | null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${IAGMX_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-iagmx-key': IAGMX_KEY,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { erro?: string };
  if (!res.ok) throw new Error(body.erro || `Falha na fila humana (${res.status})`);
  return body;
}

export async function listarFilaHumanaOferta(): Promise<FilaHumanaOfertaItem[]> {
  const body = await req<{ ok: true; itens: FilaHumanaOfertaItem[] }>('/api/admin/ofertas/fila-humana');
  return body.itens ?? [];
}

export async function assumirFilaHumanaOferta(
  id: number,
  assumidoPor: string,
): Promise<FilaHumanaOfertaItem> {
  const body = await req<{ ok: true; item: FilaHumanaOfertaItem }>(
    `/api/admin/ofertas/fila-humana/${id}/assumir`,
    {
      method: 'POST',
      body: JSON.stringify({ assumido_por: assumidoPor }),
    },
  );
  return body.item;
}

export async function resolverFilaHumanaOferta(opts: {
  id: number;
  resolucao: string;
  observacao?: string;
  owner?: string;
}): Promise<FilaHumanaOfertaItem> {
  const body = await req<{ ok: true; item: FilaHumanaOfertaItem }>(
    `/api/admin/ofertas/fila-humana/${opts.id}/resolver`,
    {
      method: 'POST',
      body: JSON.stringify({
        resolucao: opts.resolucao,
        observacao: opts.observacao,
        owner: opts.owner,
      }),
    },
  );
  return body.item;
}
