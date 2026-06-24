/**
 * @module operational-dashboard/components/operational/DateHierarchyFilter
 * @purpose Filtro local Ano / Mês / Dia (árvore com checkboxes, estilo Miro).
 */

import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DashboardFilterApi } from '../../hooks/useDashboardFilterState';

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

interface DateHierarchyFilterProps {
  filters: DashboardFilterApi;
}

export function DateHierarchyFilter({ filters }: DateHierarchyFilterProps) {
  const { state, setGlobalDateFrom, setGlobalDateTo } = filters;
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => [currentYear - 1, currentYear, currentYear + 1], [currentYear]);
  const [expandedYearsFrom, setExpandedYearsFrom] = useState<Record<number, boolean>>({
    [currentYear]: true,
  });
  const [expandedYearsTo, setExpandedYearsTo] = useState<Record<number, boolean>>({
    [currentYear]: true,
  });
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const parseYmd = (value: string): { y: number; m: number; d: number } | null => {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(d)) return null;
    return { y, m: mm, d };
  };

  const formatYmd = (y: number, m: number, d: number): string =>
    `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const daysInMonth = (y: number, m: number): number => new Date(y, m, 0).getDate();

  const selectYear = (kind: 'from' | 'to', year: number) => {
    const next = kind === 'from' ? formatYmd(year, 1, 1) : formatYmd(year, 12, 31);
    if (kind === 'from') setGlobalDateFrom(next);
    else setGlobalDateTo(next);
  };

  const selectMonth = (kind: 'from' | 'to', year: number, month: number) => {
    const day = kind === 'from' ? 1 : daysInMonth(year, month);
    const next = formatYmd(year, month, day);
    if (kind === 'from') setGlobalDateFrom(next);
    else setGlobalDateTo(next);
  };

  const selectDay = (kind: 'from' | 'to', year: number, month: number, day: number) => {
    const next = formatYmd(year, month, day);
    if (kind === 'from') setGlobalDateFrom(next);
    else setGlobalDateTo(next);
  };

  const renderPicker = (kind: 'from' | 'to', title: string) => {
    const value = kind === 'from' ? state.global.dateFrom : state.global.dateTo;
    const parsed = parseYmd(value);
    const expandedYears = kind === 'from' ? expandedYearsFrom : expandedYearsTo;
    const setExpandedYears = kind === 'from' ? setExpandedYearsFrom : setExpandedYearsTo;

    return (
      <div className="rounded-lg border-2 border-slate-400 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-bold uppercase text-slate-900">{title}</p>
          <span className="text-[11px] font-semibold text-slate-600 tabular-nums">{value}</span>
        </div>
        <div className="max-h-[280px] space-y-1 overflow-y-auto text-sm">
          {years.map((year) => {
            const yearOpen = expandedYears[year] ?? false;
            const yearChecked = parsed?.y === year;
            return (
              <div key={`${kind}-year-${year}`}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-0.5 text-slate-700"
                    onClick={() =>
                      setExpandedYears((prev) => ({ ...prev, [year]: !yearOpen }))
                    }
                    aria-label={yearOpen ? 'Recolher' : 'Expandir'}
                  >
                    {yearOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <Checkbox
                    id={`${kind}-year-${year}`}
                    checked={yearChecked}
                    onCheckedChange={() => selectYear(kind, year)}
                  />
                  <Label htmlFor={`${kind}-year-${year}`} className="cursor-pointer font-medium">
                    {year}
                  </Label>
                </div>
                {yearOpen && (
                  <div className="ml-6 mt-1 space-y-1 border-l-2 border-slate-200 pl-2">
                    {MONTH_NAMES.map((name, idx) => {
                      const monthNum = idx + 1;
                      const monthChecked = parsed?.y === year && parsed?.m === monthNum;
                      const monthKey = `${kind}-${year}-${monthNum}`;
                      const monthOpen = expandedMonths[monthKey] ?? false;
                      return (
                        <div key={`${kind}-month-${year}-${monthNum}`}>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-0.5 text-slate-700"
                              onClick={() =>
                                setExpandedMonths((prev) => ({ ...prev, [monthKey]: !monthOpen }))
                              }
                              aria-label={monthOpen ? 'Recolher' : 'Expandir'}
                            >
                              {monthOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <Checkbox
                              id={`${kind}-month-${year}-${monthNum}`}
                              checked={monthChecked}
                              onCheckedChange={() => selectMonth(kind, year, monthNum)}
                            />
                            <Label
                              htmlFor={`${kind}-month-${year}-${monthNum}`}
                              className="cursor-pointer capitalize text-slate-800"
                            >
                              {name}
                            </Label>
                          </div>
                          {monthOpen && (
                            <div className="ml-6 mt-1 grid grid-cols-7 gap-1">
                              {Array.from({ length: daysInMonth(year, monthNum) }, (_, i) => i + 1).map((day) => {
                                const checked =
                                  parsed?.y === year && parsed?.m === monthNum && parsed?.d === day;
                                return (
                                  <button
                                    key={`${kind}-day-${year}-${monthNum}-${day}`}
                                    type="button"
                                    className={`h-7 w-7 rounded-md border text-[11px] font-semibold tabular-nums ${
                                      checked
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                    onClick={() => selectDay(kind, year, monthNum, day)}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {renderPicker('from', 'De')}
      {renderPicker('to', 'Até')}
    </div>
  );
}
