/**
 * @module operational-dashboard/components/shared/DashboardEmptyState
 * @purpose Estado vazio quando não há dados no período.
 */

import { BarChart2 } from 'lucide-react';

interface DashboardEmptyStateProps {
  title?: string;
  description?: string;
}

export function DashboardEmptyState({
  title = 'Sem dados no período',
  description = 'Ajuste os filtros ou aguarde novos registros no Directus.',
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <BarChart2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
