/**
 * @module operational-dashboard/components/operational/DateHierarchyFilter
 * @purpose Filtro local Ano / Mês / Dia (árvore com checkboxes, estilo Miro).
 */

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DashboardFilterApi } from '../../hooks/useDashboardFilterState';
import { toggleInList } from '../../utils/filter-normalize';

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
  const { state, setState } = filters;
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear];
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({
    [currentYear]: true,
  });

  const hierarchy = state.dateHierarchy;

  const toggleYear = (year: number) => {
    setState((s) => ({
      ...s,
      dateHierarchy: {
        ...s.dateHierarchy,
        years: toggleInList(s.dateHierarchy.years, year),
      },
    }));
  };

  const toggleMonth = (month: number) => {
    setState((s) => ({
      ...s,
      dateHierarchy: {
        ...s.dateHierarchy,
        months: toggleInList(s.dateHierarchy.months, month),
      },
    }));
  };

  return (
    <div className="rounded-lg border-2 border-slate-400 bg-white p-3 shadow-sm">
      <p className="mb-3 text-sm font-bold uppercase text-slate-900">Ano, Mês, Dia</p>
      <div className="max-h-[280px] space-y-1 overflow-y-auto text-sm">
        {years.map((year) => {
          const yearOpen = expandedYears[year] ?? false;
          const yearChecked = hierarchy.years.includes(year);
          return (
            <div key={year}>
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
                  id={`year-${year}`}
                  checked={yearChecked}
                  onCheckedChange={() => toggleYear(year)}
                />
                <Label htmlFor={`year-${year}`} className="cursor-pointer font-medium">
                  {year}
                </Label>
              </div>
              {yearOpen && (
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-slate-200 pl-2">
                  {MONTH_NAMES.map((name, idx) => {
                    const monthNum = idx + 1;
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <Checkbox
                          id={`month-${year}-${monthNum}`}
                          checked={hierarchy.months.includes(monthNum)}
                          onCheckedChange={() => toggleMonth(monthNum)}
                        />
                        <Label
                          htmlFor={`month-${year}-${monthNum}`}
                          className="cursor-pointer capitalize text-slate-800"
                        >
                          {name}
                        </Label>
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
}
