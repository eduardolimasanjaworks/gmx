/**
 * @module operational-dashboard/components/operational/GlobalFiltersBar
 * @purpose Filtros globais OPERAÇÕES e DATA (HOJE, SEMANA, MÊS).
 */

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OperationId } from '../../constants/operations';
import { OPERATION_IDS, OPERATION_LABELS } from '../../constants/operations';
import type { GlobalDatePreset } from '../../types/filters';
import type { DashboardFilterApi } from '../../hooks/useDashboardFilterState';

const DATE_PRESETS: { id: GlobalDatePreset; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
];

interface GlobalFiltersBarProps {
  filters: DashboardFilterApi;
}

export function GlobalFiltersBar({ filters }: GlobalFiltersBarProps) {
  const { state, setGlobalDatePreset, toggleOperation, selectAllOperations } = filters;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Operações
        </h3>
        <Button variant="ghost" size="sm" onClick={selectAllOperations}>
          Selecionar todas
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {OPERATION_IDS.map((op) => {
          const active = state.global.operations.includes(op);
          return (
            <Button
              key={op}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              className={cn('uppercase')}
              onClick={() => toggleOperation(op)}
            >
              {OPERATION_LABELS[op]}
            </Button>
          );
        })}
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Data</h3>
      <ToggleGroup
        type="single"
        value={state.global.datePreset}
        onValueChange={(v) => v && setGlobalDatePreset(v as GlobalDatePreset)}
        className="flex flex-wrap gap-2"
      >
        {DATE_PRESETS.map((p) => (
          <ToggleGroupItem key={p.id} value={p.id} className="px-4">
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
