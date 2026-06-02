/**
 * @module operational-dashboard/components/routes/RoutesSection
 * @purpose TOP rotas + matriz motorista×destino (layout Miro).
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
import { useRoutesAnalytics } from '../../hooks/useRoutesAnalytics';
import { DashboardEmptyState } from '../shared/DashboardEmptyState';
import { RouteAutocomplete } from './RouteAutocomplete';

interface RoutesSectionProps {
  filters: DashboardFilterApi;
}

export function RoutesSection({ filters }: RoutesSectionProps) {
  const {
    state,
    routesRange,
    effectiveOperations,
    setRoutesChartMode,
    setRouteOrigin,
    setRouteDestination,
  } = filters;

  const { topRoutes, matrix } = useRoutesAnalytics(
    routesRange,
    effectiveOperations,
    state.routeFilter.origin,
    state.routeFilter.destination,
    state.routesChartMode,
  );

  const chartData = topRoutes.data ?? [];
  const yearLabel = routesRange.from.getFullYear();

  return (
    <section className="space-y-4 rounded-xl border-2 border-slate-400 bg-white p-4 shadow-md">
      <div className="inline-block rounded-md border-2 border-slate-800 bg-white px-4 py-2">
        <h2 className="text-lg font-black uppercase text-emerald-600">Rotas</h2>
      </div>

      <div className="flex flex-wrap gap-4">
        <RouteAutocomplete
          label="Origem"
          field="origin"
          value={state.routeFilter.origin}
          onChange={setRouteOrigin}
        />
        <RouteAutocomplete
          label="Destino"
          field="destination"
          value={state.routeFilter.destination}
          onChange={setRouteDestination}
        />
      </div>

      <ToggleGroup
        type="single"
        value={state.routesChartMode}
        onValueChange={(v) => v && setRoutesChartMode(v as 'destination' | 'route_pair')}
        className="border-2 border-slate-300 rounded-lg p-1"
      >
        <ToggleGroupItem value="destination" className="font-semibold">
          Por destino
        </ToggleGroupItem>
        <ToggleGroupItem value="route_pair" className="font-semibold">
          Por rota
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="overflow-hidden rounded-lg border-2 border-slate-500">
        <div className="bg-lime-400 px-4 py-2 border-b-2 border-slate-700">
          <h3 className="text-sm font-bold uppercase text-slate-900">
            Top rotas — {yearLabel}
          </h3>
        </div>
        <div className="h-[360px] bg-white p-4">
          {topRoutes.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length === 0 ? (
            <DashboardEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                <XAxis type="number" allowDecimals={false} stroke="#0f172a" />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11, fill: '#0f172a' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" stroke="#14532d" strokeWidth={1} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <Card className="border-2 border-slate-500 shadow-md">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-bold uppercase text-slate-900">Motorista × destino</h3>
          {matrix.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !matrix.data?.length ? (
            <DashboardEmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-700 bg-slate-100 text-left">
                    <th className="p-2 font-bold text-slate-900">Motorista</th>
                    <th className="p-2 font-bold text-slate-900">Destino</th>
                    <th className="p-2 font-bold text-slate-900">Qtd.</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.data.slice(0, 50).map((row, i) => (
                    <tr key={`${row.driverName}-${row.destination}-${i}`} className="border-b border-slate-300">
                      <td className="p-2 font-medium text-slate-900">{row.driverName}</td>
                      <td className="p-2 text-slate-800">{row.destination}</td>
                      <td className="p-2 tabular-nums font-semibold">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
