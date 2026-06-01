/**
 * @module operational-dashboard/utils/date-ranges
 * @purpose Intervalos de data para preset global e hierarquia local.
 */

import type { GlobalDatePreset } from '../types/filters';
import type { DateHierarchySelection } from '../types/filters';

export interface DateRange {
  from: Date;
  to: Date;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Segunda-feira da semana ISO (locale pt-BR) */
export function startOfWeekMonday(ref: Date): Date {
  const d = startOfDay(ref);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function globalPresetRange(preset: GlobalDatePreset, now = new Date()): DateRange {
  const to = endOfDay(now);
  if (preset === 'hoje') {
    return { from: startOfDay(now), to };
  }
  if (preset === 'semana') {
    return { from: startOfWeekMonday(now), to };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export function toIsoRangeFilter(range: DateRange): { _gte: string; _lte: string } {
  return {
    _gte: range.from.toISOString(),
    _lte: range.to.toISOString(),
  };
}

export function intersectHierarchy(
  global: DateRange,
  local: DateHierarchySelection,
  now = new Date(),
): DateRange {
  let from = global.from;
  let to = global.to;

  if (local.years.length > 0) {
    const minY = Math.min(...local.years);
    const maxY = Math.max(...local.years);
    const yFrom = new Date(minY, 0, 1);
    const yTo = endOfDay(new Date(maxY, 11, 31));
    from = from > yFrom ? from : yFrom;
    to = to < yTo ? to : yTo;
  }

  if (local.quarters.length > 0) {
    const ranges = local.quarters.flatMap((q) => {
      const year = now.getFullYear();
      const startMonth = (q - 1) * 3;
      return [
        startOfDay(new Date(year, startMonth, 1)),
        endOfDay(new Date(year, startMonth + 3, 0)),
      ];
    });
    const qFrom = new Date(Math.min(...ranges.map((d) => d.getTime())));
    const qTo = new Date(Math.max(...ranges.map((d) => d.getTime())));
    from = from > qFrom ? from : qFrom;
    to = to < qTo ? to : qTo;
  }

  if (local.months.length > 0) {
    const year = local.years[0] ?? now.getFullYear();
    const minM = Math.min(...local.months) - 1;
    const maxM = Math.max(...local.months) - 1;
    const mFrom = startOfDay(new Date(year, minM, 1));
    const mTo = endOfDay(new Date(year, maxM + 1, 0));
    from = from > mFrom ? from : mFrom;
    to = to < mTo ? to : mTo;
  }

  if (local.days.length > 0) {
    const year = local.years[0] ?? now.getFullYear();
    const month = (local.months[0] ?? now.getMonth() + 1) - 1;
    const dayNums = [...local.days].sort((a, b) => a - b);
    const dFrom = startOfDay(new Date(year, month, dayNums[0]));
    const dTo = endOfDay(new Date(year, month, dayNums[dayNums.length - 1]));
    from = from > dFrom ? from : dFrom;
    to = to < dTo ? to : dTo;
  }

  return { from, to };
}

export function formatPeriodLabel(range: DateRange): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(range.from)} — ${fmt(range.to)}`;
}
