/**
 * @module operational-dashboard/components/availability/AvailabilitySection
 * @purpose Disponibilidade diária com detalhe ao clicar na barra.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardFilterApi } from '../../hooks/useDashboardFilterState';
import { useAvailabilityDaily } from '../../hooks/useAvailabilityDaily';
import { PeriodContextBanner } from '../shared/PeriodContextBanner';
import { DashboardEmptyState } from '../shared/DashboardEmptyState';
import { formatPeriodLabel } from '../../utils/date-ranges';

interface AvailabilitySectionProps {
  filters: DashboardFilterApi;
}

export function AvailabilitySection({ filters }: AvailabilitySectionProps) {
  const {
    state,
    globalRange,
    setAvailabilitySearch,
    setSelectedAvailabilityDay,
  } = filters;

  const { data, isLoading } = useAvailabilityDaily(globalRange, state.availabilitySearch);

  const chartData = useMemo(() => data?.bars ?? [], [data?.bars]);

  const details = useMemo(() => {
    const day = state.selectedAvailabilityDay;
    if (day == null || !data?.detailsByDay) return [];
    return data.detailsByDay.get(day) ?? [];
  }, [state.selectedAvailabilityDay, data?.detailsByDay]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Disponibilidade</h2>
        <p className="text-sm text-muted-foreground">
          Veículos disponíveis por dia — clique na barra para ver detalhes
        </p>
      </div>

      <PeriodContextBanner label={formatPeriodLabel(globalRange)} />
      <Input
        placeholder="Filtrar por motorista, origem ou veículo..."
        value={state.availabilitySearch}
        onChange={(e) => setAvailabilitySearch(e.target.value)}
        className="max-w-md"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disponibilidade por dia do mês</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length === 0 ? (
            <DashboardEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" label={{ value: 'Dia', position: 'insideBottom', offset: -4 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v} veículo(s)`, 'Disponíveis']} />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(payload) => {
                    const day = payload?.payload?.day;
                    if (typeof day === 'number') setSelectedAvailabilityDay(day);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {state.selectedAvailabilityDay != null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Detalhes — dia {state.selectedAvailabilityDay}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {details.length === 0 ? (
              <DashboardEmptyState title="Sem registros neste dia" />
            ) : (
              <ul className="divide-y">
                {details.map((row) => (
                  <li key={row.id} className="grid gap-1 py-3 sm:grid-cols-3 text-sm">
                    <span className="font-medium">{row.driverName}</span>
                    <span className="text-muted-foreground">Origem: {row.origin}</span>
                    <span className="text-muted-foreground">Veículo: {row.vehicleLabel}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
