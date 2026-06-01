/**
 * @module operational-dashboard/utils/route-parsing
 * @purpose Chaves de agrupamento para gráfico de rotas (destino vs par origem→destino).
 */

import type { RoutesChartMode } from '../types/filters';

export function routeGroupKey(
  origin: string | null | undefined,
  destination: string | null | undefined,
  mode: RoutesChartMode,
): string {
  const o = (origin ?? '').trim() || '—';
  const d = (destination ?? '').trim() || '—';
  if (mode === 'destination') return d;
  return `${o} → ${d}`;
}

export function matchesRouteFilter(
  origin: string | null | undefined,
  destination: string | null | undefined,
  filterOrigin: string,
  filterDestination: string,
): boolean {
  const o = (origin ?? '').trim().toLowerCase();
  const d = (destination ?? '').trim().toLowerCase();
  const fo = filterOrigin.trim().toLowerCase();
  const fd = filterDestination.trim().toLowerCase();
  if (fo && !o.includes(fo)) return false;
  if (fd && !d.includes(fd)) return false;
  return true;
}
