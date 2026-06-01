/**
 * @module operational-dashboard/components/operational/KpiCards
 * @purpose Quatro cartões KPI da visão operacional.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Package, PackageOpen, PackageCheck } from 'lucide-react';
import type { OperationalKpis } from '../../services/dashboard-queries';

interface KpiCardsProps {
  data?: OperationalKpis;
  isLoading: boolean;
}

const items = [
  { key: 'availableVehicles' as const, label: 'Veículos disponíveis', icon: Truck },
  { key: 'inTransit' as const, label: 'Em trânsito', icon: Package },
  { key: 'openLoads' as const, label: 'Cargas em aberto', icon: PackageOpen },
  { key: 'closedLoads' as const, label: 'Cargas finalizadas', icon: PackageCheck },
];

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <Skeleton key={i.key} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ key, label, icon: Icon }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            <Icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{data?.[key] ?? 0}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
