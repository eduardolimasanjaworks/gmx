/**
 * @module operational-dashboard/components/operational/StatusPieChart
 * @purpose Gráfico de pizza por status de follow (Miro).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { PIE_STATUS_COLORS, PIE_STATUS_LABELS } from '../../constants/status-labels';
import type { PieSlice } from '../../services/dashboard-queries';
import { DashboardEmptyState } from '../shared/DashboardEmptyState';

interface StatusPieChartProps {
  slices?: PieSlice[];
  isLoading: boolean;
}

export function StatusPieChart({ slices, isLoading }: StatusPieChartProps) {
  const chartData =
    slices?.map((s) => ({
      name: PIE_STATUS_LABELS[s.key],
      value: s.value,
      fill: PIE_STATUS_COLORS[s.key],
    })) ?? [];

  const total = chartData.reduce((a, b) => a + b.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por status</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
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
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
