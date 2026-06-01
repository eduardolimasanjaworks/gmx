/**
 * @module operational-dashboard/utils/status-normalize
 * @purpose Normaliza status do Directus para chaves do gráfico de pizza.
 */

import type { PieStatusKey } from '../constants/status-labels';
import { PIE_STATUS_KEYS } from '../constants/status-labels';

const ALIASES: Record<string, PieStatusKey> = {
  finalizada: 'FINALIZADA',
  finalized: 'FINALIZADA',
  noshow: 'NOSHOW',
  'no show': 'NOSHOW',
  cancelada: 'CANCELADA',
  canceled: 'CANCELADA',
  cancelado: 'CANCELADA',
  'furo ambev': 'FURO AMBEV',
  furo: 'FURO AMBEV',
  declinada: 'DECLINADA',
  declined: 'DECLINADA',
};

export function normalizeFollowStatus(raw: string | null | undefined): PieStatusKey | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  const upper = raw.trim().toUpperCase();
  if (PIE_STATUS_KEYS.includes(upper as PieStatusKey)) return upper as PieStatusKey;
  return null;
}

export function isClosedLoadStatus(raw: string | null | undefined): boolean {
  return normalizeFollowStatus(raw) === 'FINALIZADA';
}
