/**
 * @module telemetria/services/telemetry-store
 * @purpose Persistência e leitura de presença usando Directus (coleção telemetria_eventos + app_users).
 */

import { createItem, readItems } from '@directus/sdk';
import { directus } from '@/lib/directus';
import type {
  TelemetryEventPayload,
  TelemetryPresenceStatus,
  TelemetryRow,
  TelemetrySnapshot,
} from '../types/telemetry';

const HEARTBEAT_STALE_MS = 90_000;
const COLLECTION = 'telemetria_eventos';

const appUserIdByEmail = new Map<string, number>();

function userKeyOf(meta: Record<string, unknown>) {
  return (
    String(meta.directus_user_id || '') ||
    String(meta.user_email || '').toLowerCase() ||
    String(meta.user_name || '')
  );
}

function statusFromMetaAndState(
  state: string,
  lastSeenIso: string,
  meta: Record<string, unknown>,
): TelemetryPresenceStatus {
  const ageMs = Date.now() - new Date(lastSeenIso).getTime();
  if (ageMs > HEARTBEAT_STALE_MS) return 'offline';

  const dutyStatus = String(meta.duty_status || '');
  if (dutyStatus === 'pausado') return 'em_pausa';
  if (dutyStatus === 'inativo' || meta.duty_active === false) return 'offline';

  if (state === 'TAB_ACTIVE_FOCUSED') return 'em_foco';
  if (state === 'TAB_ACTIVE_VISIBLE_UNFOCUSED') return 'aba_aberta_sem_foco';
  if (state === 'TAB_ACTIVE_HIDDEN' || state === 'TAB_POSSIBLY_SUSPENDED') return 'aba_oculta';
  if (state === 'TAB_PROBABLY_CLOSED') return 'offline';
  return 'offline';
}

const EMPTY_SUMMARY = {
  total: 0,
  em_foco: 0,
  aba_aberta_sem_foco: 0,
  aba_oculta: 0,
  em_pausa: 0,
  offline: 0,
};

function toJSON(meta: Record<string, unknown>): string {
  try {
    return JSON.stringify(meta);
  } catch {
    return '{}';
  }
}

function parseMetadata(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function isForbidden(error: unknown): boolean {
  const e = error as { status?: number; response?: { status?: number }; errors?: { extensions?: { code?: string } }[] };
  return (
    e?.status === 403 ||
    e?.response?.status === 403 ||
    e?.errors?.[0]?.extensions?.code === 'FORBIDDEN'
  );
}

function isCollectionMissing(error: unknown): boolean {
  const e = error as { errors?: { extensions?: { code?: string } }[] };
  const code = e?.errors?.[0]?.extensions?.code;
  return code === 'COLLECTION_NOT_FOUND' || code === 'INVALID_FOREIGN_KEY';
}

async function resolveAppUserId(email?: string): Promise<number | undefined> {
  if (!email) return undefined;
  const key = email.toLowerCase();
  if (appUserIdByEmail.has(key)) return appUserIdByEmail.get(key);

  const rows = await directus.request(
    readItems('app_users' as never, {
      filter: { email: { _eq: email } },
      fields: ['id'] as never,
      limit: 1,
    }),
  ).catch(() => []);

  const id = (rows as { id?: number }[])?.[0]?.id;
  if (typeof id === 'number') appUserIdByEmail.set(key, id);
  return id;
}

function buildSummary(rows: TelemetryRow[]): TelemetrySnapshot['summary'] {
  return rows.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.status] += 1;
      return acc;
    },
    { ...EMPTY_SUMMARY },
  );
}

function rowsFromEvents(rowsRaw: unknown[], sinceIso: string): TelemetryRow[] {
  const latestByUser = new Map<string, TelemetryRow>();
  const tabSetByUser = new Map<string, Set<string>>();

  for (const row of rowsRaw ?? []) {
    const meta = parseMetadata((row as { metadata_json?: unknown }).metadata_json);
    const mergedMeta = {
      ...meta,
      tab_id: (row as { tab_id?: string }).tab_id || meta.tab_id,
      tab_state: (row as { tab_state?: string }).tab_state || meta.tab_state,
      directus_user_id: (row as { directus_user_id?: string }).directus_user_id || meta.directus_user_id,
      user_email: (row as { user_email?: string }).user_email || meta.user_email,
      user_name: (row as { user_name?: string }).user_name || meta.user_name,
      current_path: (row as { current_path?: string }).current_path || meta.current_path,
      app_user_id: (row as { app_user_id?: number }).app_user_id || meta.app_user_id,
    };

    const userKey = userKeyOf(mergedMeta);
    if (!userKey) continue;

    if (!tabSetByUser.has(userKey)) tabSetByUser.set(userKey, new Set());
    const tabId = String(mergedMeta.tab_id || '');
    if (tabId) tabSetByUser.get(userKey)?.add(tabId);

    if (latestByUser.has(userKey)) continue;

    const state = String(mergedMeta.tab_state || 'TAB_PROBABLY_CLOSED');
    const lastSeen =
      (row as { event_at?: string }).event_at ||
      (row as { date_created?: string }).date_created ||
      new Date().toISOString();

    if (lastSeen < sinceIso) continue;

    latestByUser.set(userKey, {
      userKey,
      appUserId: mergedMeta.app_user_id as number | string | undefined,
      directusUserId: String(mergedMeta.directus_user_id || ''),
      userEmail: String(mergedMeta.user_email || 'sem-email'),
      userName: String(mergedMeta.user_name || mergedMeta.user_email || 'Usuário'),
      currentPath: String(mergedMeta.current_path || '/dashboard'),
      lastEventType: String((row as { event_type?: string }).event_type || 'activity') as TelemetryRow['lastEventType'],
      lastState: state as TelemetryRow['lastState'],
      lastSeen,
      status: statusFromMetaAndState(state, lastSeen, mergedMeta),
      tabCount: 0,
      isOnline: statusFromMetaAndState(state, lastSeen, mergedMeta) !== 'offline',
    });
  }

  return [...latestByUser.values()]
    .map((r) => ({ ...r, tabCount: tabSetByUser.get(r.userKey)?.size ?? 1 }))
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
}

async function mergeWithAppUsers(liveRows: TelemetryRow[]): Promise<TelemetryRow[]> {
  const appUsers = await directus.request(
    readItems('app_users' as never, {
      fields: ['id', 'email', 'display_name', 'active'] as never,
      limit: 500,
    }),
  ).catch(() => []);

  const liveByEmail = new Map(liveRows.map((r) => [r.userEmail.toLowerCase(), r]));
  const merged: TelemetryRow[] = [];

  for (const u of appUsers as { id: number; email?: string; display_name?: string; active?: boolean }[]) {
    const email = String(u.email || '').toLowerCase();
    if (!email) continue;

    const live = liveByEmail.get(email);
    if (live) {
      merged.push({
        ...live,
        appUserId: u.id,
        userName: u.display_name || live.userName,
        userKey: String(u.id),
      });
      liveByEmail.delete(email);
    } else {
      merged.push({
        userKey: String(u.id),
        appUserId: u.id,
        directusUserId: '',
        userEmail: u.email || email,
        userName: u.display_name || u.email || 'Usuário',
        currentPath: '—',
        lastEventType: 'activity',
        lastState: 'TAB_PROBABLY_CLOSED',
        lastSeen: new Date(0).toISOString(),
        status: 'offline',
        tabCount: 0,
        isOnline: false,
      });
    }
  }

  for (const orphan of liveByEmail.values()) {
    merged.push(orphan);
  }

  return merged.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });
}

export async function writeTelemetryEvent(payload: TelemetryEventPayload): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const appUserId = await resolveAppUserId(payload.userEmail);
  const metadata = {
    tab_id: payload.tabId,
    tab_state: payload.tabState,
    directus_user_id: payload.directusUserId,
    user_email: payload.userEmail,
    user_name: payload.userName,
    app_user_id: appUserId,
    current_path: payload.currentPath,
    ...payload.metadata,
  };

  const insertPayload = {
    event_type: payload.eventType,
    tab_id: payload.tabId,
    tab_state: payload.tabState,
    user_email: payload.userEmail,
    user_name: payload.userName,
    directus_user_id: payload.directusUserId,
    app_user_id: appUserId ?? null,
    current_path: payload.currentPath,
    metadata_json: toJSON(metadata),
    event_at: nowIso,
  };

  try {
    await directus.request(createItem(COLLECTION as never, insertPayload as never));
    return true;
  } catch (error) {
    if (isForbidden(error)) return false;
    if (isCollectionMissing(error)) {
      console.error('telemetria_eventos não existe no Directus. Execute scripts/setup-telemetria-directus.py');
      return false;
    }
    console.error('telemetria write error:', error);
    return false;
  }
}

export async function fetchTelemetrySnapshot(intervalMinutes: number): Promise<TelemetrySnapshot> {
  const sinceIso = new Date(Date.now() - intervalMinutes * 60_000).toISOString();

  const rowsRaw = await directus.request(
    readItems(COLLECTION as never, {
      fields: [
        'event_type',
        'tab_id',
        'tab_state',
        'user_email',
        'user_name',
        'directus_user_id',
        'app_user_id',
        'current_path',
        'metadata_json',
        'event_at',
        'date_created',
      ] as never,
      filter: {
        _or: [
          { event_at: { _gte: sinceIso } },
          { date_created: { _gte: sinceIso } },
        ],
      } as never,
      sort: ['-event_at', '-date_created'] as never,
      limit: 3000,
    }),
  ).catch((error) => {
    if (isForbidden(error) || isCollectionMissing(error)) return [] as unknown[];
    console.warn('telemetria directus read skipped:', error);
    return [] as unknown[];
  });

  const liveRows = rowsFromEvents(rowsRaw ?? [], sinceIso);
  const rows = await mergeWithAppUsers(liveRows);
  const summary = buildSummary(rows);

  return { rows, summary };
}
