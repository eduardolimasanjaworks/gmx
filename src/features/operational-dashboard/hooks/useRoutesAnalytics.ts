/**
 * @module operational-dashboard/hooks/useRoutesAnalytics
 * @purpose React Query para TOP rotas e matriz motorista×destino.
 */

import { useQuery } from '@tanstack/react-query';
import type { OperationId } from '../constants/operations';
import type { RoutesChartMode } from '../types/filters';
import type { DateRange } from '../utils/date-ranges';
import {
  fetchDriverDestinationMatrix,
  fetchTopRoutes,
} from '../services/dashboard-queries';

export function useRoutesAnalytics(
  range: DateRange,
  operations: OperationId[],
  origin: string,
  destination: string,
  mode: RoutesChartMode,
) {
  const topRoutes = useQuery({
    queryKey: ['op-dash-routes', range.from.toISOString(), operations, origin, destination, mode],
    queryFn: () => fetchTopRoutes(range, operations, origin, destination, mode),
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const matrix = useQuery({
    queryKey: ['op-dash-matrix', range.from.toISOString(), operations, origin, destination],
    queryFn: () => fetchDriverDestinationMatrix(range, operations, origin, destination),
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  return { topRoutes, matrix };
}
