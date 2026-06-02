/**
 * @module operational-dashboard/components/operational/StatusPieChart
 * @purpose Gráfico de pizza por status (cabeçalho amarelo, labels Miro).
 */

import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PIE_STATUS_COLORS, PIE_STATUS_LABELS } from '../../constants/status-labels';
import type { PieSlice } from '../../services/dashboard-queries';
import { DashboardEmptyState } from '../shared/DashboardEmptyState';
import type { DateRange } from '../../utils/date-ranges';

interface StatusPieChartProps {
  slices?: PieSlice[];
  isLoading: boolean;
  range: DateRange;
}

function statusPeriodTitle(range: DateRange): string {
  const from = range.from;
  const to = range.to;
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return format(from, 'MMMM', { locale: ptBR }).toUpperCase();
  }
  return `${format(from, 'MMM', { locale: ptBR })} – ${format(to, 'MMM yyyy', { locale: ptBR })}`.toUpperCase();
}

export function StatusPieChart({ slices, isLoading, range }: StatusPieChartProps) {
  const chartData =
    slices?.map((s) => ({
      key: s.key,
      name: PIE_STATUS_LABELS[s.key].toUpperCase(),
      value: s.value,
      fill: PIE_STATUS_COLORS[s.key],
    })) ?? [];

  const total = chartData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="overflow-hidden rounded-lg border-2 border-slate-500 bg-white shadow-md">
      <div className="border-b-2 border-amber-500 bg-amber-300 px-4 py-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
          Status — {statusPeriodTitle(range)}
        </h3>
      </div>
      <div className="h-[380px] p-4">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : total === 0 ? (
          <DashboardEmptyState title="Nenhum status no período" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="42%"
                cy="50%"
                outerRadius={120}
                labelLine
                label={({ name, value, percent }) =>
                  `${name} ${value} (${(percent * 100).toFixed(1).replace('.', ',')}%)`
                }
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} stroke="#1e293b" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value}`, name]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
