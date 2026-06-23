const IAGMX_URL = (
  import.meta.env.VITE_IAGMX_URL || "https://iagmx.sanjaworks.com"
).replace(/\/$/, "");

const IAGMX_KEY = import.meta.env.VITE_IAGMX_ADMIN_KEY || "iagmx-pausa-2026";

function headers() {
  return {
    "Content-Type": "application/json",
    "x-iagmx-key": IAGMX_KEY,
  };
}

export interface IagmxPromptMeta {
  prompt: string;
  atualizadoEm: string | null;
  caracteres?: number;
  padrao?: string;
  promptForcado?: string;
  atualizadoEmForcado?: string | null;
  padraoForcado?: string;
}

export interface IagmxPipelineStage {
  ordem: number;
  etapa: string;
  rotulo: string;
  ts: number;
  duracaoMs?: number;
  detalhe?: Record<string, unknown>;
}

export interface IagmxPipelineTrace {
  id: string;
  telefone: string;
  remoteJid: string;
  entrada: string;
  tipos: string[];
  inicioMs: number;
  fimMs?: number;
  status: "processando" | "ok" | "silencio" | "erro" | "enfileirado";
  etapas: IagmxPipelineStage[];
  resposta?: string;
  erro?: string;
}

export interface IagmxPipelineTraceListResponse {
  build: string;
  total: number;
  traces: IagmxPipelineTrace[];
}

export interface IagmxOrchestratorSnapshot {
  promptSistema: IagmxPromptMeta | null;
  promptOcr: IagmxPromptMeta | null;
  pipeline: IagmxPipelineTraceListResponse | null;
  orquestracaoTexto: IagmxOrquestracaoTextoMeta | null;
  mensagensFluxo: IagmxMensagensFluxoMeta | null;
  historicoConfiguracao: IagmxHistoricoConfiguracaoItem[];
}

export interface IagmxOrquestracaoTextoConfig {
  camadaHumana: string;
  instrucaoFormatacao: string;
}

export interface IagmxOrquestracaoTextoMeta {
  config: IagmxOrquestracaoTextoConfig;
  padrao: IagmxOrquestracaoTextoConfig;
  atualizadoEm: string | null;
}

export interface IagmxMensagensFluxoConfig {
  [key: string]: string | string[];
}

export interface IagmxMensagensFluxoMeta {
  config: IagmxMensagensFluxoConfig;
  padrao: IagmxMensagensFluxoConfig;
  atualizadoEm: string | null;
}

export interface IagmxHistoricoConfiguracaoItem {
  id: number;
  chave: string;
  origem: string;
  antes: string | null;
  depois: string | null;
  criadoEm: string;
}

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: headers() });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchIagmxOrchestratorSnapshot(): Promise<IagmxOrchestratorSnapshot> {
  const [promptSistema, promptOcr, pipeline, orquestracaoTexto, mensagensFluxo, historico] = await Promise.all([
    safeFetchJson<IagmxPromptMeta>(`${IAGMX_URL}/api/prompt`),
    safeFetchJson<IagmxPromptMeta>(`${IAGMX_URL}/api/config/ocr`),
    safeFetchJson<IagmxPipelineTraceListResponse>(`${IAGMX_URL}/api/pipeline/traces?limite=8`),
    safeFetchJson<IagmxOrquestracaoTextoMeta>(`${IAGMX_URL}/api/config/orquestracao-texto`),
    safeFetchJson<IagmxMensagensFluxoMeta>(`${IAGMX_URL}/api/config/mensagens-fluxo`),
    safeFetchJson<{ itens: IagmxHistoricoConfiguracaoItem[] }>(`${IAGMX_URL}/api/config/historico?limite=12`),
  ]);

  return {
    promptSistema,
    promptOcr,
    pipeline,
    orquestracaoTexto,
    mensagensFluxo,
    historicoConfiguracao: historico?.itens ?? [],
  };
}

export async function updateIagmxOrquestracaoTexto(
  body: Partial<IagmxOrquestracaoTextoConfig>,
): Promise<{ ok: boolean; config?: IagmxOrquestracaoTextoConfig; mensagem?: string }> {
  const response = await fetch(`${IAGMX_URL}/api/config/orquestracao-texto`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    config?: IagmxOrquestracaoTextoConfig;
    mensagem?: string;
    erro?: string;
  };

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar os textos de orquestracao");
  }

  return {
    ok: Boolean(data.ok),
    config: data.config,
    mensagem: data.mensagem,
  };
}

export async function updateIagmxMensagensFluxo(
  body: IagmxMensagensFluxoConfig,
): Promise<{ ok: boolean; config?: IagmxMensagensFluxoConfig; mensagem?: string }> {
  const response = await fetch(`${IAGMX_URL}/api/config/mensagens-fluxo`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    config?: IagmxMensagensFluxoConfig;
    mensagem?: string;
    erro?: string;
  };

  if (!response.ok) {
    throw new Error(data.erro || "Nao foi possivel atualizar as mensagens de fluxo");
  }

  return {
    ok: Boolean(data.ok),
    config: data.config,
    mensagem: data.mensagem,
  };
}
