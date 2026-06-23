/**
 * Tipos compartilhados do fluxo de arquivos e sugestoes OCR da IA.
 * Evita duplicacao entre painel, dialogo de revisao e historico.
 * Mantem a estrutura do card do motorista modular e indexavel.
 */
export interface ArquivoOriginal {
  id: number;
  tipo_documento?: string;
  nome_arquivo?: string;
  mime_type?: string;
  link?: string;
  asset_id?: string;
  status?: string;
  date_created?: string;
}

export interface SugestaoOcr {
  id: number;
  tipo_documento?: string;
  colecao_destino?: string;
  status?: string;
  link?: string;
  arquivo_original_id?: number;
  sugestao_documento?: string;
  sugestao_motorista?: string;
  campos_extraidos?: string;
  date_created?: string;
  revisada_em?: string;
  revisada_por_id?: string;
  revisada_por_nome?: string;
  revisada_por_email?: string;
  campos_aplicados?: string;
  campos_rejeitados?: string;
}
