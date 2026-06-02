/**
 * @module operational-dashboard/components/availability/AvailabilitySection
 * @purpose Disponibilidade diária com detalhe ao clicar na barra (layout Miro).
 */

import { useMemo } from 'react';
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
import { DashboardEmptyState } from '../shared/DashboardEmptyState';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AvailabilitySectionProps {
  filters: DashboardFilterApi;
}

export function AvailabilitySection({ filters }: AvailabilitySectionProps) {
  const { state, globalRange, setAvailabilitySearch, setSelectedAvailabilityDay } = filters;

  const { data, isLoading } = useAvailabilityDaily(globalRange, state.availabilitySearch);

  const chartData = useMemo(() => data?.bars ?? [], [data?.bars]);

  const details = useMemo(() => {
    const day = state.selectedAvailabilityDay;
    if (day == null || !data?.detailsByDay) return [];
    return data.detailsByDay.get(day) ?? [];
  }, [state.selectedAvailabilityDay, data?.detailsByDay]);

  const monthLabel = format(globalRange.from, 'MMMM', { locale: ptBR }).toUpperCase();

  return (
    <section className="space-y-4 rounded-xl border-2 border-slate-400 bg-white p-4 shadow-md">
      <div className="inline-block rounded-md border-2 border-slate-800 bg-white px-4 py-2">
        <h2 className="text-lg font-black uppercase text-emerald-600">Disponibilidade</h2>
      </div>

      <Input
        placeholder="Filtro: motorista, origem ou veículo..."
        value={state.availabilitySearch}
        onChange={(e) => setAvailabilitySearch(e.target.value)}
        className="max-w-md border-2 border-slate-400"
      />

      <div className="overflow-hidden rounded-lg border-2 border-slate-500">
        <div className="bg-lime-400 px-4 py-2 border-b-2 border-slate-700">
          <h3 className="text-sm font-bold uppercase text-slate-900">
            Disponibilidade diária — {monthLabel}
          </h3>
        </div>
        <div className="h-[300px] bg-white p-4">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length === 0 ? (
            <DashboardEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                <XAxis dataKey="day" stroke="#0f172a" />
                <YAxis allowDecimals={false} stroke="#0f172a" />
                <Tooltip formatter={(v: number) => [`${v} veículo(s)`, 'Disponíveis']} />
                <Bar
                  dataKey="count"
                  fill="#22c55e"
                  stroke="#14532d"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(payload) => {
                    const day = (payload as { payload?: { day?: number } })?.payload?.day;
                    if (typeof day === 'number') setSelectedAvailabilityDay(day);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {state.selectedAvailabilityDay != null && (
        <div className="rounded-lg border-2 border-slate-500 bg-slate-100 p-4">
          <h3 className="mb-3 text-center text-sm font-bold uppercase text-emerald-700">
            Disponibilidade detalhadas — dia {state.selectedAvailabilityDay}
          </h3>
          {details.length === 0 ? (
            <DashboardEmptyState title="Sem registros neste dia" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {details.map((row) => (
                <div
                  key={row.id}
                  className="rounded-md border-2 border-emerald-700 bg-lime-300 p-3 text-sm font-semibold text-slate-900"
                >
                  <p>1 — Motorista: {row.driverName}</p>
                  <p>Origem: {row.origin}</p>
                  <p>Veículo: {row.vehicleLabel}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
