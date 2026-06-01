/**
 * @module operational-dashboard/components/operational/OperationalSection
 * @purpose Seção operacional: filtros globais, KPIs, pizza e filtros locais.
 */

import type { DashboardFilterApi } from '../../hooks/useDashboardFilterState';
import { useOperationalMetrics } from '../../hooks/useOperationalMetrics';
import { PeriodContextBanner } from '../shared/PeriodContextBanner';
import { GlobalFiltersBar } from './GlobalFiltersBar';
import { KpiCards } from './KpiCards';
import { StatusPieChart } from './StatusPieChart';
import { StatusCheckboxFilters } from './StatusCheckboxFilters';
import { emptyMeansAll } from '../../utils/filter-normalize';
import { PIE_STATUS_KEYS } from '../../constants/status-labels';

interface OperationalSectionProps {
  filters: DashboardFilterApi;
}

export function OperationalSection({ filters }: OperationalSectionProps) {
  const {
    state,
    operationalRange,
    effectiveOperations,
    periodBannerText,
    togglePieStatus,
  } = filters;

  const pieStatuses = emptyMeansAll(state.pieStatuses, [...PIE_STATUS_KEYS]);
  const { kpis, pie } = useOperationalMetrics(
    operationalRange,
    effectiveOperations,
    pieStatuses,
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Operacional</h2>
        <p className="text-sm text-muted-foreground">
          Indicadores e acionamento no período selecionado
        </p>
      </div>

      <GlobalFiltersBar filters={filters} />
      <PeriodContextBanner
        label={periodBannerText}
        hint="Filtros de status abaixo refinam apenas o gráfico de pizza."
      />
      <KpiCards data={kpis.data} isLoading={kpis.isLoading} />
      <StatusCheckboxFilters selected={state.pieStatuses} onToggle={togglePieStatus} />
      <StatusPieChart slices={pie.data} isLoading={pie.isLoading} />
    </section>
  );
}
