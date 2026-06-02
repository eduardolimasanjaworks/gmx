/**
 * @module operational-dashboard/components/operational/OperationalSection
 * @purpose Bloco superior do dashboard operacional (layout Miro).
 */

import type { DashboardFilterApi } from '../../hooks/useDashboardFilterState';
import { useOperationalMetrics } from '../../hooks/useOperationalMetrics';
import { OperationalTopFilters } from './OperationalTopFilters';
import { KpiCards } from './KpiCards';
import { StatusPieChart } from './StatusPieChart';
import { StatusCheckboxFilters } from './StatusCheckboxFilters';
import { DateHierarchyFilter } from './DateHierarchyFilter';
import { emptyMeansAll } from '../../utils/filter-normalize';
import { PIE_STATUS_KEYS } from '../../constants/status-labels';

interface OperationalSectionProps {
  filters: DashboardFilterApi;
}

export function OperationalSection({ filters }: OperationalSectionProps) {
  const { state, operationalRange, effectiveOperations, togglePieStatus } = filters;

  const pieStatuses = emptyMeansAll(state.pieStatuses, [...PIE_STATUS_KEYS]);
  const { kpis, pie } = useOperationalMetrics(
    operationalRange,
    effectiveOperations,
    pieStatuses,
  );

  return (
    <section className="space-y-5 rounded-xl border-2 border-slate-300 bg-slate-100/80 p-4 md:p-6 shadow-lg">
      <h1 className="text-2xl font-black uppercase tracking-wide text-blue-700 md:text-3xl">
        Dashboard operacional
      </h1>

      {/* Filtros empilhados no canto superior direito, acima dos KPIs */}
      <div className="flex justify-end">
        <OperationalTopFilters filters={filters} />
      </div>

      <KpiCards data={kpis.data} isLoading={kpis.isLoading} />

      <hr className="border-0 border-t-4 border-green-500" />

      {/* Pizza + filtros laterais */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StatusPieChart
            slices={pie.data}
            isLoading={pie.isLoading}
            range={operationalRange}
          />
        </div>
        <div className="space-y-4">
          <DateHierarchyFilter filters={filters} />
          <StatusCheckboxFilters
            selected={state.pieStatuses}
            onToggle={togglePieStatus}
          />
        </div>
      </div>
    </section>
  );
}
