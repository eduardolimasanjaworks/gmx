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
    // #region debug-point A:gmx-atendimento-get
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'gmx-iagmx-integration', runId: 'pre-fix', hypothesisId: 'A', location: 'gmx/src/services/iagmxAtendimentoService.ts:obterEstadoAtendimentoIa', msg: '[DEBUG] GMX consultando estado de atendimento IA', data: { telefoneOriginal: telefone, telefoneNormalizado: tel, url: `${IAGMX_URL}/api/atendimento/contato/${tel}` }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}`, { headers: headers() });
    // #region debug-point A:gmx-atendimento-get-response
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'gmx-iagmx-integration', runId: 'pre-fix', hypothesisId: 'A', location: 'gmx/src/services/iagmxAtendimentoService.ts:obterEstadoAtendimentoIa', msg: '[DEBUG] GMX recebeu resposta de estado atendimento IA', data: { telefoneNormalizado: tel, ok: res.ok, status: res.status, type: res.type }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    if (!res.ok) return null;
    return (await res.json()) as EstadoAtendimentoIa;
  } catch (error) {
    // #region debug-point A:gmx-atendimento-get-error
    fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'gmx-iagmx-integration', runId: 'pre-fix', hypothesisId: 'A', location: 'gmx/src/services/iagmxAtendimentoService.ts:obterEstadoAtendimentoIa', msg: '[DEBUG] GMX falhou ao consultar estado atendimento IA', data: { telefoneOriginal: telefone, telefoneNormalizado: tel, error: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    return null;
  }
}

export async function pausarIaMotorista(telefone: string, motivo?: string): Promise<boolean> {
  const tel = normalizarTel(telefone);
  // #region debug-point A:gmx-atendimento-pausar
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'gmx-iagmx-integration', runId: 'pre-fix', hypothesisId: 'A', location: 'gmx/src/services/iagmxAtendimentoService.ts:pausarIaMotorista', msg: '[DEBUG] GMX disparando pausar IA', data: { telefoneOriginal: telefone, telefoneNormalizado: tel, motivo: motivo ?? 'pausado_pelo_erp', url: `${IAGMX_URL}/api/atendimento/contato/${tel}/pausar` }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}/pausar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ motivo: motivo ?? 'pausado_pelo_erp' }),
  });
  return res.ok;
}

export async function despausarIaMotorista(telefone: string): Promise<boolean> {
  const tel = normalizarTel(telefone);
  // #region debug-point A:gmx-atendimento-despausar
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'gmx-iagmx-integration', runId: 'pre-fix', hypothesisId: 'A', location: 'gmx/src/services/iagmxAtendimentoService.ts:despausarIaMotorista', msg: '[DEBUG] GMX disparando despausar IA', data: { telefoneOriginal: telefone, telefoneNormalizado: tel, url: `${IAGMX_URL}/api/atendimento/contato/${tel}/pausar` }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}/pausar`, {
    method: 'DELETE',
    headers: headers(),
  });
  return res.ok;
}

export async function limparPrecisaAtendimento(telefone: string): Promise<boolean> {
  const tel = normalizarTel(telefone);
  // #region debug-point A:gmx-atendimento-limpar-precisa
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'gmx-iagmx-integration', runId: 'pre-fix', hypothesisId: 'A', location: 'gmx/src/services/iagmxAtendimentoService.ts:limparPrecisaAtendimento', msg: '[DEBUG] GMX limpando flag precisa atendimento', data: { telefoneOriginal: telefone, telefoneNormalizado: tel, url: `${IAGMX_URL}/api/atendimento/contato/${tel}/precisa` }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}/precisa`, {
    method: 'DELETE',
    headers: headers(),
  });
  return res.ok;
}

export async function marcarPrecisaAtendimento(telefone: string, motivo: string): Promise<boolean> {
  const tel = normalizarTel(telefone);
  // #region debug-point A:gmx-atendimento-marcar-precisa
  fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'gmx-iagmx-integration', runId: 'pre-fix', hypothesisId: 'A', location: 'gmx/src/services/iagmxAtendimentoService.ts:marcarPrecisaAtendimento', msg: '[DEBUG] GMX marcando precisa atendimento', data: { telefoneOriginal: telefone, telefoneNormalizado: tel, motivo, url: `${IAGMX_URL}/api/atendimento/contato/${tel}/precisa` }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  const res = await fetch(`${IAGMX_URL}/api/atendimento/contato/${tel}/precisa`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ motivo }),
  });
  return res.ok;
}
