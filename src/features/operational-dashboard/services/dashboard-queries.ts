/**
 * @module operational-dashboard/services/dashboard-queries
 * @purpose Único ponto de leitura Directus para o dashboard operacional.
 */

import { readItems } from '@directus/sdk';
import { publicDirectus } from '@/lib/directus';
import type { OperationId } from '../constants/operations';
import type { PieStatusKey } from '../constants/status-labels';
import { PIE_STATUS_KEYS } from '../constants/status-labels';
import type { DateRange } from '../utils/date-ranges';
import { toIsoRangeFilter } from '../utils/date-ranges';
import { productMatchesOperations } from '../utils/product-match';
import { normalizeFollowStatus, isClosedLoadStatus } from '../utils/status-normalize';
import { routeGroupKey, matchesRouteFilter } from '../utils/route-parsing';
import type { RoutesChartMode } from '../types/filters';

const IN_TRANSIT_STATUSES = ['in_transit', 'loading', 'unloading'];

export interface OperationalKpis {
  availableVehicles: number;
  inTransit: number;
  openLoads: number;
  closedLoads: number;
}

export interface PieSlice {
  key: PieStatusKey;
  value: number;
}

export interface DailyAvailabilityBar {
  day: number;
  count: number;
}

export interface AvailabilityDetailRow {
  id: number;
  driverName: string;
  origin: string;
  vehicleLabel: string;
  dateCreated: string;
}

export interface RouteBarRow {
  label: string;
  count: number;
}

export interface DriverDestinationCell {
  driverName: string;
  destination: string;
  count: number;
}

function produtoField(row: { produto?: string; produto_predominante?: string }): string {
  return row.produto ?? row.produto_predominante ?? '';
}

function driverDisplayName(
  driver: { nome?: string; sobrenome?: string } | number | null | undefined,
): string {
  if (!driver || typeof driver === 'number') return 'Motorista';
  const n = [driver.nome, driver.sobrenome].filter(Boolean).join(' ');
  return n || 'Motorista';
}

export async function fetchOperationalKpis(
  range: DateRange,
  operations: OperationId[],
): Promise<OperationalKpis> {
  const dateFilter = { date_created: toIsoRangeFilter(range) };

  const [disponiveis, embarques, followRows] = await Promise.all([
    publicDirectus.request(
      readItems('disponivel', {
        fields: ['id', 'status', 'motorista_id', 'date_created', 'produto'],
        filter: dateFilter,
        sort: ['-date_created'],
        limit: 2000,
      }),
    ),
    publicDirectus.request(
      readItems('embarques', {
        fields: ['id', 'status', 'produto', 'produto_predominante', 'date_created'],
        filter: {
          ...dateFilter,
          status: { _in: IN_TRANSIT_STATUSES },
        },
        limit: 2000,
      }),
    ),
    publicDirectus.request(
      readItems('follow', {
        fields: ['id', 'status', 'produto', 'date_created'],
        filter: dateFilter,
        limit: 5000,
      }),
    ),
  ]);

  const latestByDriver = new Map<number | string, (typeof disponiveis)[0]>();
  for (const row of disponiveis) {
    const driverId = typeof row.motorista_id === 'object' ? row.motorista_id?.id : row.motorista_id;
    if (driverId != null && !latestByDriver.has(driverId)) {
      latestByDriver.set(driverId, row);
    }
  }
  const availableVehicles = [...latestByDriver.values()].filter(
    (r) =>
      r.status === 'disponivel' &&
      productMatchesOperations(produtoField(r as { produto?: string }), operations),
  ).length;

  const inTransit = embarques.filter((e) =>
    productMatchesOperations(produtoField(e), operations),
  ).length;

  const filteredFollow = followRows.filter((f) =>
    productMatchesOperations(f.produto, operations),
  );
  let openLoads = 0;
  let closedLoads = 0;
  for (const f of filteredFollow) {
    if (isClosedLoadStatus(f.status)) closedLoads += 1;
    else openLoads += 1;
  }

  return { availableVehicles, inTransit, openLoads, closedLoads };
}

export async function fetchFollowStatusPie(
  range: DateRange,
  operations: OperationId[],
  statusFilter: string[],
): Promise<PieSlice[]> {
  const rows = await publicDirectus.request(
    readItems('follow', {
      fields: ['status', 'produto', 'date_created'],
      filter: { date_created: toIsoRangeFilter(range) },
      limit: 5000,
    }),
  );

  const counts = new Map<PieStatusKey, number>();
  for (const key of PIE_STATUS_KEYS) counts.set(key, 0);

  const allowed =
    statusFilter.length === 0
      ? PIE_STATUS_KEYS
      : statusFilter.map((s) => s.toUpperCase() as PieStatusKey);

  for (const row of rows) {
    if (!productMatchesOperations(row.produto, operations)) continue;
    const norm = normalizeFollowStatus(row.status);
    if (!norm || !allowed.includes(norm)) continue;
    counts.set(norm, (counts.get(norm) ?? 0) + 1);
  }

  return PIE_STATUS_KEYS.filter((k) => allowed.includes(k)).map((key) => ({
    key,
    value: counts.get(key) ?? 0,
  }));
}

export async function fetchDailyAvailability(
  range: DateRange,
  search: string,
): Promise<{ bars: DailyAvailabilityBar[]; detailsByDay: Map<number, AvailabilityDetailRow[]> }> {
  const rows = await publicDirectus.request(
    readItems('disponivel', {
      fields: [
        'id',
        'status',
        'date_created',
        'local_disponibilidade',
        'motorista_id.id',
        'motorista_id.nome',
        'motorista_id.sobrenome',
        'motorista_id.tipo_veiculo',
        'motorista_id.placa',
      ],
      filter: {
        date_created: toIsoRangeFilter(range),
        status: { _eq: 'disponivel' },
      },
      sort: ['-date_created'],
      limit: 3000,
    }),
  );

  const q = search.trim().toLowerCase();
  const barsMap = new Map<number, number>();
  const detailsByDay = new Map<number, AvailabilityDetailRow[]>();

  for (const row of rows) {
    const created = new Date(row.date_created);
    const day = created.getDate();
    const driverName = driverDisplayName(
      typeof row.motorista_id === 'object' ? row.motorista_id : null,
    );
    const origin = row.local_disponibilidade ?? '—';
    const vehicleLabel =
      (typeof row.motorista_id === 'object' &&
        (row.motorista_id?.tipo_veiculo || row.motorista_id?.placa)) ||
      '—';

    if (q) {
      const hay = `${driverName} ${origin} ${vehicleLabel}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    barsMap.set(day, (barsMap.get(day) ?? 0) + 1);

    const detail: AvailabilityDetailRow = {
      id: row.id,
      driverName,
      origin,
      vehicleLabel: String(vehicleLabel),
      dateCreated: row.date_created,
    };
    const list = detailsByDay.get(day) ?? [];
    list.push(detail);
    detailsByDay.set(day, list);
  }

  const bars = [...barsMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, count]) => ({ day, count }));

  return { bars, detailsByDay };
}

export async function fetchTopRoutes(
  range: DateRange,
  operations: OperationId[],
  originFilter: string,
  destFilter: string,
  mode: RoutesChartMode,
  limit = 12,
): Promise<RouteBarRow[]> {
  const rows = await publicDirectus.request(
    readItems('embarques', {
      fields: ['origin', 'destination', 'produto', 'produto_predominante', 'date_created'],
      filter: { date_created: toIsoRangeFilter(range) },
      limit: 3000,
    }),
  );

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!productMatchesOperations(produtoField(row), operations)) continue;
    if (!matchesRouteFilter(row.origin, row.destination, originFilter, destFilter)) continue;
    const label = routeGroupKey(row.origin, row.destination, mode);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function fetchDriverDestinationMatrix(
  range: DateRange,
  operations: OperationId[],
  originFilter: string,
  destFilter: string,
): Promise<DriverDestinationCell[]> {
  const rows = await publicDirectus.request(
    readItems('embarques', {
      fields: [
        'origin',
        'destination',
        'produto',
        'produto_predominante',
        'driver_id.id',
        'driver_id.nome',
        'driver_id.sobrenome',
      ],
      filter: { date_created: toIsoRangeFilter(range) },
      limit: 3000,
    }),
  );

  const matrix = new Map<string, DriverDestinationCell>();
  for (const row of rows) {
    if (!productMatchesOperations(produtoField(row), operations)) continue;
    if (!matchesRouteFilter(row.origin, row.destination, originFilter, destFilter)) continue;
    const dest = (row.destination ?? '—').split('-')[0].trim();
    const driverName = driverDisplayName(
      typeof row.driver_id === 'object' ? row.driver_id : null,
    );
    const key = `${driverName}|${dest}`;
    const prev = matrix.get(key);
    if (prev) prev.count += 1;
    else matrix.set(key, { driverName, destination: dest, count: 1 });
  }

  return [...matrix.values()].sort((a, b) => b.count - a.count);
}

export async function fetchDistinctLocations(
  collection: 'embarques',
  field: 'origin' | 'destination',
  prefix: string,
): Promise<string[]> {
  const rows = await publicDirectus.request(
    readItems(collection, {
      fields: [field],
      filter: prefix
        ? { [field]: { _icontains: prefix } }
        : undefined,
      limit: 200,
    }),
  );
  const set = new Set<string>();
  for (const row of rows) {
    const v = row[field];
    if (v?.trim()) set.add(v.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
