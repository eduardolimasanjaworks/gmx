/**
 * @module telemetria/types/telemetry
 * @purpose Tipos de eventos e snapshot de presença para a aba Telemetria.
 */

export type TelemetryTabState =
  | 'TAB_ACTIVE_FOCUSED'
  | 'TAB_ACTIVE_VISIBLE_UNFOCUSED'
  | 'TAB_ACTIVE_HIDDEN'
  | 'TAB_POSSIBLY_SUSPENDED'
  | 'TAB_PROBABLY_CLOSED';

export type TelemetryEventType =
  | 'init'
  | 'heartbeat'
  | 'state_change'
  | 'focus'
  | 'blur'
  | 'visibility_change'
  | 'online'
  | 'offline'
  | 'shutdown'
  | 'wakeup'
  | 'activity';

export type TelemetryPresenceStatus =
  | 'em_foco'
  | 'aba_aberta_sem_foco'
  | 'aba_oculta'
  | 'em_pausa'
  | 'offline';

export interface TelemetryEventPayload {
  eventType: TelemetryEventType;
  tabState: TelemetryTabState;
  tabId: string;
  directusUserId?: string;
  userEmail?: string;
  userName?: string;
  currentPath?: string;
  metadata?: Record<string, unknown>;
}

export interface TelemetryRow {
  userKey: string;
  appUserId?: number | string;
  directusUserId?: string;
  userEmail: string;
  userName: string;
  currentPath: string;
  lastEventType: TelemetryEventType;
  lastState: TelemetryTabState;
  lastSeen: string;
  status: TelemetryPresenceStatus;
  tabCount: number;
  isOnline: boolean;
}

export interface TelemetrySummary {
  total: number;
  em_foco: number;
  aba_aberta_sem_foco: number;
  aba_oculta: number;
  em_pausa: number;
  offline: number;
}

export interface TelemetrySnapshot {
  rows: TelemetryRow[];
  summary: TelemetrySummary;
}
