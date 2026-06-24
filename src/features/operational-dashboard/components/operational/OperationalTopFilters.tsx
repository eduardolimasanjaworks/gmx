/**
 * @module operational-dashboard/components/operational/OperationalTopFilters
 * @purpose Filtros globais compactos em dropdown (DATA e OPERAÇÕES).
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import type { OperationId } from '../../constants/operations';
import { OPERATION_IDS } from '../../constants/operations';
import type { DashboardFilterApi } from '../../hooks/useDashboardFilterState';

interface OperationalTopFiltersProps {
  filters: DashboardFilterApi;
}

export function OperationalTopFilters({ filters }: OperationalTopFiltersProps) {
  const { state, toggleOperation, selectAllOperations } = filters;

  return (
    <div className="flex items-center gap-2">
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
            <button
              key={op}
              type="button"
              className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => toggleOperation(op as OperationId)}
            >
              <span>{op}</span>
              <span className="text-xs text-muted-foreground">
                {state.global.operations.includes(op) ? 'ON' : 'OFF'}
              </span>
            </button>
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
