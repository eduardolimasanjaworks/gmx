/**
 * @module operational-dashboard/components/operational/KpiCards
 * @purpose Quatro cartões KPI no topo (layout Miro, alto contraste).
 */

import { Skeleton } from '@/components/ui/skeleton';
import type { OperationalKpis } from '../../services/dashboard-queries';

interface KpiCardsProps {
  data?: OperationalKpis;
  isLoading: boolean;
}

const items = [
  { key: 'availableVehicles' as const, title: 'Veículos disponíveis' },
  { key: 'inTransit' as const, title: 'Veículos em trânsito' },
  { key: 'openLoads' as const, title: 'Cargas em aberto' },
  { key: 'closedLoads' as const, title: 'Cargas fechadas' },
];

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((i) => (
          <Skeleton key={i.key} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ key, title }) => (
        <div
          key={key}
          className="rounded-lg border-2 border-blue-600 bg-white px-4 py-3 shadow-md"
        >
          <p className="text-[11px] font-bold uppercase leading-tight text-slate-900">
            {title}
          </p>
          <p className="text-[10px] font-semibold uppercase text-slate-600">(quantidade)</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-xs font-medium text-slate-500">Card</span>
            <span className="text-4xl font-bold tabular-nums text-blue-700">
              {data?.[key] ?? 0}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
