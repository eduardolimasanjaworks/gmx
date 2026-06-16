/**
 * @module operational-dashboard/hooks/useAvailabilityDaily
 * @purpose React Query para gráfico diário de disponibilidade.
 */

import { useQuery } from '@tanstack/react-query';
import type { DateRange } from '../utils/date-ranges';
import { fetchDailyAvailability } from '../services/dashboard-queries';

export function useAvailabilityDaily(range: DateRange, search: string) {
  return useQuery({
    queryKey: ['op-dash-availability', range.from.toISOString(), search],
    queryFn: () => fetchDailyAvailability(range, search),
    retry: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
