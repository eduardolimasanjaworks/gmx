/**
 * @module telemetria/hooks/useTelemetriaQuery
 * @purpose Query de snapshot de presença para aba Telemetria.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchTelemetrySnapshot } from '../services/telemetry-store';

export function useTelemetriaQuery(intervalMinutes: number) {
  return useQuery({
    queryKey: ['telemetria-snapshot', intervalMinutes],
    queryFn: () => fetchTelemetrySnapshot(intervalMinutes),
    refetchInterval: 5_000,
    staleTime: 3_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
