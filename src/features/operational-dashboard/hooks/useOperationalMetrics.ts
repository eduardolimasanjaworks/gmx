/**
 * @module operational-dashboard/hooks/useOperationalMetrics
 * @purpose React Query para KPIs e pizza da seção operacional.
 */

import { useQuery } from '@tanstack/react-query';
import type { OperationId } from '../constants/operations';
import type { DateRange } from '../utils/date-ranges';
import { fetchFollowStatusPie, fetchOperationalKpis } from '../services/dashboard-queries';

export function useOperationalMetrics(
  range: DateRange,
  operations: OperationId[],
  pieStatuses: string[],
) {
  const kpis = useQuery({
    queryKey: ['op-dash-kpis', range.from.toISOString(), operations],
    queryFn: () => fetchOperationalKpis(range, operations),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: (prev) => prev,
  });

  const pie = useQuery({
    queryKey: ['op-dash-pie', range.from.toISOString(), operations, pieStatuses],
    queryFn: () => fetchFollowStatusPie(range, operations, pieStatuses),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: (prev) => prev,
  });

  return { kpis, pie };
}
