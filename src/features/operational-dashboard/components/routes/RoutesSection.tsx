/**
 * @module operational-dashboard/components/routes/RoutesSection
 * @purpose TOP rotas com toggle destino vs par, matriz motorista×destino.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PeriodContextBanner } from '../shared/PeriodContextBanner';
import { DashboardEmptyState } from '../shared/DashboardEmptyState';
import { formatPeriodLabel } from '../../utils/date-ranges';
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

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Rotas</h2>
        <p className="text-sm text-muted-foreground">
          Rotas mais frequentes e matriz motorista × destino
        </p>
      </div>

      <PeriodContextBanner label={formatPeriodLabel(routesRange)} />

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
      >
        <ToggleGroupItem value="destination">Por destino</ToggleGroupItem>
        <ToggleGroupItem value="route_pair">Por rota</ToggleGroupItem>
      </ToggleGroup>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">TOP rotas</CardTitle>
        </CardHeader>
        <CardContent className="h-[360px]">
          {topRoutes.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length === 0 ? (
            <DashboardEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Motorista × destino</CardTitle>
        </CardHeader>
        <CardContent>
          {matrix.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !matrix.data?.length ? (
            <DashboardEmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Motorista</th>
                    <th className="py-2 pr-4">Destino</th>
                    <th className="py-2">Qtd.</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.data.slice(0, 50).map((row, i) => (
                    <tr key={`${row.driverName}-${row.destination}-${i}`} className="border-b">
                      <td className="py-2 pr-4 font-medium">{row.driverName}</td>
                      <td className="py-2 pr-4">{row.destination}</td>
                      <td className="py-2 tabular-nums">{row.count}</td>
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
