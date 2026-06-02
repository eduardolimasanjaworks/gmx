/**
 * @module operational-dashboard/components/operational/OperationalTopFilters
 * @purpose Filtros globais empilhados (operações + data) no canto superior direito.
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OperationId } from '../../constants/operations';
import { OPERATION_IDS } from '../../constants/operations';
import type { GlobalDatePreset } from '../../types/filters';
import type { DashboardFilterApi } from '../../hooks/useDashboardFilterState';

const DATE_PRESETS: { id: GlobalDatePreset; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
];

interface OperationalTopFiltersProps {
  filters: DashboardFilterApi;
}

export function OperationalTopFilters({ filters }: OperationalTopFiltersProps) {
  const {
    state,
    setGlobalDatePreset,
    toggleOperation,
    selectAllOperations,
  } = filters;

  const allOpsSelected = state.global.operations.length === OPERATION_IDS.length;

  return (
    <div className="flex flex-col items-end gap-3 min-w-[200px]">
      <div className="w-full rounded-lg border-2 border-slate-400 bg-slate-50 p-3 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800">
          Operação
        </p>
        <div className="flex flex-col gap-1.5">
          {OPERATION_IDS.map((op) => {
            const active = state.global.operations.includes(op);
            return (
              <Button
                key={op}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className={cn(
                  'h-8 w-full justify-start font-semibold uppercase',
                  active && 'bg-blue-700 hover:bg-blue-800',
                )}
                onClick={() => toggleOperation(op)}
              >
                {op}
              </Button>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant={allOpsSelected ? 'default' : 'outline'}
            className={cn(
              'h-8 w-full justify-start font-semibold uppercase',
              allOpsSelected && 'bg-emerald-600 hover:bg-emerald-700',
            )}
            onClick={selectAllOperations}
          >
            Todos
          </Button>
        </div>
      </div>

      <div className="w-full rounded-lg border-2 border-slate-400 bg-slate-50 p-3 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800">Data</p>
        <div className="flex flex-col gap-1.5">
          {DATE_PRESETS.map((p) => {
            const active = state.global.datePreset === p.id;
            return (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className={cn(
                  'h-8 w-full justify-start font-semibold uppercase',
                  active && 'bg-emerald-600 hover:bg-emerald-700',
                )}
                onClick={() => setGlobalDatePreset(p.id)}
              >
                {p.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
