/**
 * @module operational-dashboard/types/filters
 * @purpose Tipos de estado dos filtros do dashboard operacional.
 */

import type { OperationId } from '../constants/operations';

export type GlobalDatePreset = 'hoje' | 'semana' | 'mes';

export type RoutesChartMode = 'destination' | 'route_pair';

export interface GlobalFilters {
  operations: OperationId[];
  datePreset: GlobalDatePreset;
}

export interface DateHierarchySelection {
  years: number[];
  quarters: number[];
  months: number[];
  days: number[];
}

export interface RouteFilterValues {
  origin: string;
  destination: string;
}

export interface DashboardFilterState {
  global: GlobalFilters;
  pieStatuses: string[];
  dateHierarchy: DateHierarchySelection;
  routeFilter: RouteFilterValues;
  routeDateHierarchy: DateHierarchySelection;
  routesChartMode: RoutesChartMode;
  availabilitySearch: string;
  selectedAvailabilityDay: number | null;
}
