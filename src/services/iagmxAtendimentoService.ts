/**
 * Integração portal GMX ↔ iagmx (pausa IA, flags de atendimento).
 */
const IAGMX_URL = (
  import.meta.env.VITE_IAGMX_URL || 'https://iagmx.sanjaworks.com'
).replace(/\/$/, '');

const IAGMX_KEY = import.meta.env.VITE_IAGMX_ADMIN_KEY || 'iagmx-pausa-2026';

export interface EstadoAtendimentoIa {
  telefone: string;
  motorista_id: number | null;
  ia_pausada: boolean;
  ia_pausa_motivo?: string | null;
  precisa_atendimento: boolean;
  precisa_atendimento_motivo?: string | null;
  ultima_intencao_whatsapp?: string | null;
  ultima_intencao_em?: string | null;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-iagmx-key': IAGMX_KEY,
  };
}

function normalizarTel(telefone: string) {
  return telefone.replace(/\D/g, '');
}

export async function obterEstadoAtendimentoIa(telefone: string): Promise<EstadoAtendimentoIa | null> {
  const tel = normalizarTel(telefone);
  if (!tel) return null;
  try {
    const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}`, { headers: headers() });
    if (!res.ok) return null;
    return (await res.json()) as EstadoAtendimentoIa;
  } catch {
    return null;
  }
}

export async function pausarIaMotorista(telefone: string, motivo?: string): Promise<boolean> {
  const tel = normalizarTel(telefone);
  const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}/pausar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ motivo: motivo ?? 'pausado_pelo_erp' }),
  });
  return res.ok;
}

export async function despausarIaMotorista(telefone: string): Promise<boolean> {
  const tel = normalizarTel(telefone);
  const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}/pausar`, {
    method: 'DELETE',
    headers: headers(),
  });
  return res.ok;
}

export async function limparPrecisaAtendimento(telefone: string): Promise<boolean> {
  const tel = normalizarTel(telefone);
  const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}/precisa`, {
    method: 'DELETE',
    headers: headers(),
  });
  return res.ok;
}

export async function marcarPrecisaAtendimento(telefone: string, motivo: string): Promise<boolean> {
  const tel = normalizarTel(telefone);
  const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}/precisa`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ motivo }),
  });
  return res.ok;
}
