/**
 * @module operational-dashboard/utils/date-ranges
 * @purpose Intervalos de data para preset global e hierarquia local.
 */

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

export function rangeFromYmd(dateFrom: string, dateTo: string, now = new Date()): DateRange {
  const safeFrom = /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ? dateFrom : '';
  const safeTo = /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? dateTo : '';
  const fallbackFrom = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const fallbackTo = endOfDay(now);

  const from = safeFrom ? startOfDay(new Date(`${safeFrom}T00:00:00`)) : fallbackFrom;
  const to = safeTo ? endOfDay(new Date(`${safeTo}T00:00:00`)) : fallbackTo;
  if (from <= to) return { from, to };
  return { from: startOfDay(to), to: endOfDay(from) };
}

export function toIsoRangeFilter(range: DateRange): { _gte: string; _lte: string } {
  return {
    _gte: range.from.toISOString(),
    _lte: range.to.toISOString(),
  };
}

export function formatPeriodLabel(range: DateRange): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(range.from)} — ${fmt(range.to)}`;
}
