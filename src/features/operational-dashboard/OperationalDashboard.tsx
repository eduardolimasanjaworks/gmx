/**
 * @module operational-dashboard/OperationalDashboard
 * @purpose Shell do dashboard operacional (3 seções Miro).
 */

import { useDashboardFilterState } from './hooks/useDashboardFilterState';
import { OperationalSection } from './components/operational/OperationalSection';
import { AvailabilitySection } from './components/availability/AvailabilitySection';
import { RoutesSection } from './components/routes/RoutesSection';
import { Separator } from '@/components/ui/separator';

export function OperationalDashboard() {
  const filters = useDashboardFilterState();

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard operacional</h1>
        <p className="text-muted-foreground">
          Visão consolidada de operações, disponibilidade e rotas — dados em tempo real
        </p>
      </header>

      <OperationalSection filters={filters} />
      <Separator />
      <AvailabilitySection filters={filters} />
      <Separator />
      <RoutesSection filters={filters} />
    </div>
  );
}
