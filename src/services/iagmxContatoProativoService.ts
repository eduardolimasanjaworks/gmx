const IAGMX_URL =
  import.meta.env.VITE_IAGMX_URL || 'https://iagmx.sanjaworks.com';

const IAGMX_KEY = import.meta.env.VITE_IAGMX_ADMIN_KEY || 'iagmx-pausa-2026';

export interface ContatoProativoLote {
  id: number;
  data_referencia: string;
  status: string;
  total_sugeridos: number;
  criterios_json: string | null;
}

export interface ContatoProativoItem {
  id: number;
  lote_id: number;
  motorista_id: number;
  telefone: string;
  nome: string | null;
  cidade: string | null;
  estado: string | null;
  operacao: string | null;
  status_item: string;
  prioridade_score: number;
  score_tempo: number;
  score_geo: number;
  score_status: number;
  horas_sem_contato: number | null;
  horas_sem_posicao: number | null;
  justificativa: string | null;
  ultima_conversa_em: string | null;
  ultima_posicao_em: string | null;
  localizacao_atual: string | null;
  observacao: string | null;
  aprovado_em: string | null;
  aprovado_por: string | null;
  disparado_em: string | null;
  disparado_por: string | null;
  erro_envio: string | null;
  adiar_ate: string | null;
}

export interface ContatoProativoHistoricoItem extends ContatoProativoItem {
  data_referencia: string;
}

export interface ContatoProativoSnapshot {
  lote: ContatoProativoLote;
  itens: ContatoProativoItem[];
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-iagmx-key': IAGMX_KEY,
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Falha ${res.status} ao acessar IAGMX`);
  }
  return res.json() as Promise<T>;
}

export async function fetchContatoProativoAtual(): Promise<ContatoProativoSnapshot> {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/lote-atual`, {
    headers: headers(),
  });
  return parseJson<ContatoProativoSnapshot>(res);
}

export async function gerarContatoProativo(): Promise<ContatoProativoSnapshot> {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/gerar`, {
    method: 'POST',
    headers: headers(),
  });
  return parseJson<ContatoProativoSnapshot>(res);
}

export async function fetchContatoProativoHistorico(limit = 100) {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/historico?limit=${limit}`, {
    headers: headers(),
  });
  return parseJson<{ ok: boolean; itens: ContatoProativoHistoricoItem[] }>(res);
}

export async function aprovarContatoProativo(id: number, autor: string) {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/item/${id}/aprovar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ autor }),
  });
  return parseJson<{ ok: boolean; item: ContatoProativoItem }>(res);
}

export async function rejeitarContatoProativo(id: number, autor: string) {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/item/${id}/rejeitar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ autor }),
  });
  return parseJson<{ ok: boolean; item: ContatoProativoItem }>(res);
}

export async function adiarContatoProativo(id: number, autor: string, dias: number, observacao?: string) {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/item/${id}/adiar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ autor, dias, observacao }),
  });
  return parseJson<{ ok: boolean; item: ContatoProativoItem }>(res);
}

export async function dispararContatoProativo(id: number, autor: string) {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/item/${id}/disparar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ autor }),
  });
  return parseJson<{ ok: boolean; item: ContatoProativoItem; enviado: boolean; motivo?: string }>(res);
}

export async function aprovarContatoProativoEmLote(itemIds: number[], autor: string) {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/lote/aprovar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ item_ids: itemIds, autor }),
  });
  return parseJson<{ ok: boolean; itens: ContatoProativoItem[] }>(res);
}

export async function dispararContatoProativoEmLote(opts: {
  itemIds: number[];
  autor: string;
  intervaloMs: number;
}) {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/lote/disparar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      item_ids: opts.itemIds,
      autor: opts.autor,
      intervalo_ms: opts.intervaloMs,
    }),
  });
  return parseJson<{
    ok: boolean;
    enviados: Array<{ id: number; telefone: string }>;
    falhas: Array<{ id: number; telefone?: string; motivo: string }>;
  }>(res);
}

export async function adiarContatoProativoEmLote(opts: {
  itemIds: number[];
  autor: string;
  dias: number;
  observacao?: string;
}) {
  const res = await fetch(`${IAGMX_URL}/api/contato-proativo/lote/adiar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      item_ids: opts.itemIds,
      autor: opts.autor,
      dias: opts.dias,
      observacao: opts.observacao,
    }),
  });
  return parseJson<{ ok: boolean; itens: ContatoProativoItem[] }>(res);
}
