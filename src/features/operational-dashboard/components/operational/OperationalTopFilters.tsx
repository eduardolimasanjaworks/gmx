/**
 * @module operational-dashboard/components/operational/OperationalTopFilters
 * @purpose Filtros globais compactos em dropdown (DATA e OPERAÇÕES).
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
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
  const { state, setGlobalDatePreset, toggleOperation, selectAllOperations } = filters;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-9 rounded-full bg-emerald-600 px-4 text-xs font-bold uppercase hover:bg-emerald-700">
            Data
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Janela de data</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={state.global.datePreset}
            onValueChange={(v) => setGlobalDatePreset(v as GlobalDatePreset)}
          >
            {DATE_PRESETS.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id}>
                {p.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-9 rounded-full bg-emerald-600 px-4 text-xs font-bold uppercase hover:bg-emerald-700">
            Operações
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filtrar operações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {OPERATION_IDS.map((op) => (
            <DropdownMenuCheckboxItem
              key={op}
              checked={state.global.operations.includes(op)}
              onCheckedChange={() => toggleOperation(op as OperationId)}
            >
              {op}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start rounded-none px-2 text-xs font-semibold uppercase"
            onClick={selectAllOperations}
          >
            Todos
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
