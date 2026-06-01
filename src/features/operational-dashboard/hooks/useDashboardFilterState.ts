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
  GlobalDatePreset,
  RoutesChartMode,
} from '../types/filters';
import { emptyMeansAll, toggleInList } from '../utils/filter-normalize';
import {
  globalPresetRange,
  intersectHierarchy,
  formatPeriodLabel,
} from '../utils/date-ranges';
import type { DateRange } from '../utils/date-ranges';

const initialState: DashboardFilterState = {
  global: {
    operations: [...OPERATION_IDS],
    datePreset: 'hoje',
  },
  pieStatuses: [...PIE_STATUS_KEYS],
  dateHierarchy: { years: [], quarters: [], months: [], days: [] },
  routeFilter: { origin: '', destination: '' },
  routeDateHierarchy: { years: [], quarters: [], months: [], days: [] },
  routesChartMode: 'destination',
  availabilitySearch: '',
  selectedAvailabilityDay: null,
};

export function useDashboardFilterState() {
  const [state, setState] = useState<DashboardFilterState>(initialState);

  const setGlobalDatePreset = useCallback((datePreset: GlobalDatePreset) => {
    setState((s) => ({ ...s, global: { ...s.global, datePreset } }));
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
    () => globalPresetRange(state.global.datePreset),
    [state.global.datePreset],
  );

  const operationalRange = useMemo(
    () => intersectHierarchy(globalRange, state.dateHierarchy),
    [globalRange, state.dateHierarchy],
  );

  const routesRange = useMemo(
    () => intersectHierarchy(globalRange, state.routeDateHierarchy),
    [globalRange, state.routeDateHierarchy],
  );

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
    setGlobalDatePreset,
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
