/**
 * @module operational-dashboard/constants/operations
 * @purpose Operações de negócio exibidas nos filtros globais do dashboard.
 */

export const OPERATION_IDS = ['ARROZ', 'LATA', 'ME', 'MALTE'] as const;
export type OperationId = (typeof OPERATION_IDS)[number];

export const OPERATION_ALL = 'TODOS' as const;

export type OperationFilterValue = OperationId | typeof OPERATION_ALL;

export const OPERATION_LABELS: Record<OperationFilterValue, string> = {
  ARROZ: 'Arroz',
  LATA: 'Lata',
  ME: 'ME',
  MALTE: 'Malte',
  TODOS: 'Todas as operações',
};

/** Palavras-chave para match em `produto` no Directus */
export const OPERATION_KEYWORDS: Record<OperationId, string[]> = {
  ARROZ: ['arroz'],
  LATA: ['lata'],
  ME: ['me', 'm.e.'],
  MALTE: ['malte'],
};
