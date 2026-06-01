/**
 * @module operational-dashboard/constants/status-labels
 * @purpose Cores e chaves canônicas dos status do gráfico de pizza.
 */

export const PIE_STATUS_KEYS = [
  'FINALIZADA',
  'NOSHOW',
  'CANCELADA',
  'FURO AMBEV',
  'DECLINADA',
] as const;

export type PieStatusKey = (typeof PIE_STATUS_KEYS)[number];

export const PIE_STATUS_COLORS: Record<PieStatusKey, string> = {
  FINALIZADA: '#22c55e',
  NOSHOW: '#64748b',
  CANCELADA: '#ef4444',
  'FURO AMBEV': '#f97316',
  DECLINADA: '#3b82f6',
};

export const PIE_STATUS_LABELS: Record<PieStatusKey, string> = {
  FINALIZADA: 'Finalizada',
  NOSHOW: 'No show',
  CANCELADA: 'Cancelada',
  'FURO AMBEV': 'Furo Ambev',
  DECLINADA: 'Declinada',
};

/** Status considerados "carga fechada" para KPI */
export const CLOSED_LOAD_STATUSES: PieStatusKey[] = ['FINALIZADA'];
