/**
 * @module operational-dashboard/OperationalDashboard
 * @purpose Shell do dashboard operacional (3 seções Miro).
 */

import { useDashboardFilterState } from './hooks/useDashboardFilterState';
import { OperationalSection } from './components/operational/OperationalSection';
import { AvailabilitySection } from './components/availability/AvailabilitySection';
import { RoutesSection } from './components/routes/RoutesSection';

export function OperationalDashboard() {
  const filters = useDashboardFilterState();

  return (
    <div className="space-y-8 bg-slate-50/50 p-1 md:p-2">
      <OperationalSection filters={filters} />
      <AvailabilitySection filters={filters} />
      <RoutesSection filters={filters} />
    </div>
  );
}
