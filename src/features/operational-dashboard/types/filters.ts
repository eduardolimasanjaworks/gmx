/**
 * @module operational-dashboard/types/filters
 * @purpose Tipos de estado dos filtros do dashboard operacional.
 */

import type { OperationId } from '../constants/operations';

export type RoutesChartMode = 'destination' | 'route_pair';

export interface GlobalFilters {
  operations: OperationId[];
  dateFrom: string;
  dateTo: string;
}

export interface RouteFilterValues {
  origin: string;
  destination: string;
}

export interface DashboardFilterState {
  global: GlobalFilters;
  pieStatuses: string[];
  routeFilter: RouteFilterValues;
  routesChartMode: RoutesChartMode;
  availabilitySearch: string;
  selectedAvailabilityDay: number | null;
}
