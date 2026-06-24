/**
 * @module operational-dashboard/hooks/useDashboardFilterState
 * @purpose Estado compartilhado dos filtros do dashboard operacional.
 */

import { useCallback, useMemo, useState } from 'react';
import type { OperationId } from '../constants/operations';
import { OPERATION_IDS } from '../constants/operations';
import { PIE_STATUS_KEYS } from '../constants/status-labels';
import type {
  DashboardFilterState,
  RoutesChartMode,
} from '../types/filters';
import { emptyMeansAll, toggleInList } from '../utils/filter-normalize';
import {
  rangeFromYmd,
  formatPeriodLabel,
} from '../utils/date-ranges';
import type { DateRange } from '../utils/date-ranges';

function defaultGlobalDates(now = new Date()): { dateFrom: string; dateTo: string } {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    dateFrom: `${y}-${m}-01`,
    dateTo: `${y}-${m}-${d}`,
  };
}

const initialState: DashboardFilterState = {
  global: {
    operations: [...OPERATION_IDS],
    ...defaultGlobalDates(),
  },
  pieStatuses: [...PIE_STATUS_KEYS],
  routeFilter: { origin: '', destination: '' },
  routesChartMode: 'destination',
  availabilitySearch: '',
  selectedAvailabilityDay: null,
};

export function useDashboardFilterState() {
  const [state, setState] = useState<DashboardFilterState>(initialState);

  const setGlobalDateFrom = useCallback((dateFrom: string) => {
    setState((s) => ({ ...s, global: { ...s.global, dateFrom } }));
  }, []);

  const setGlobalDateTo = useCallback((dateTo: string) => {
    setState((s) => ({ ...s, global: { ...s.global, dateTo } }));
  }, []);

  const toggleOperation = useCallback((op: OperationId) => {
    setState((s) => ({
      ...s,
      global: {
        ...s.global,
        operations: toggleInList(s.global.operations, op),
      },
    }));
  }, []);

  const selectAllOperations = useCallback(() => {
    setState((s) => ({
      ...s,
      global: { ...s.global, operations: [...OPERATION_IDS] },
    }));
  }, []);

  const globalRange = useMemo(
    () => rangeFromYmd(state.global.dateFrom, state.global.dateTo),
    [state.global.dateFrom, state.global.dateTo],
  );

  const operationalRange: DateRange = globalRange;
  const routesRange: DateRange = globalRange;

  const effectiveOperations = useMemo(
    () => emptyMeansAll(state.global.operations, [...OPERATION_IDS]),
    [state.global.operations],
  );

  const periodBannerText = useMemo(
    () => formatPeriodLabel(operationalRange),
    [operationalRange],
  );

  const setPieStatuses = useCallback((pieStatuses: string[]) => {
    setState((s) => ({ ...s, pieStatuses }));
  }, []);

  const togglePieStatus = useCallback((status: string) => {
    setState((s) => ({
      ...s,
      pieStatuses: toggleInList(s.pieStatuses, status),
    }));
  }, []);

  const setRoutesChartMode = useCallback((routesChartMode: RoutesChartMode) => {
    setState((s) => ({ ...s, routesChartMode }));
  }, []);

  const setAvailabilitySearch = useCallback((availabilitySearch: string) => {
    setState((s) => ({ ...s, availabilitySearch }));
  }, []);

  const setSelectedAvailabilityDay = useCallback((day: number | null) => {
    setState((s) => ({ ...s, selectedAvailabilityDay: day }));
  }, []);

  const setRouteOrigin = useCallback((origin: string) => {
    setState((s) => ({ ...s, routeFilter: { ...s.routeFilter, origin } }));
  }, []);

  const setRouteDestination = useCallback((destination: string) => {
    setState((s) => ({ ...s, routeFilter: { ...s.routeFilter, destination } }));
  }, []);

  return {
    state,
    setState,
    setGlobalDateFrom,
    setGlobalDateTo,
    toggleOperation,
    selectAllOperations,
    globalRange,
    operationalRange,
    routesRange,
    effectiveOperations,
    periodBannerText,
    setPieStatuses,
    togglePieStatus,
    setRoutesChartMode,
    setAvailabilitySearch,
    setSelectedAvailabilityDay,
    setRouteOrigin,
    setRouteDestination,
  };
}

export type DashboardFilterApi = ReturnType<typeof useDashboardFilterState>;
