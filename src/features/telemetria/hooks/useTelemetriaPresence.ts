/**
 * @module telemetria/hooks/useTelemetriaPresence
 * @purpose Coletar eventos de foco/visibilidade/rede e enviar heartbeat durante plantão.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { writeTelemetryEvent } from '../services/telemetry-store';
import type { TelemetryTabState } from '../types/telemetry';

const HEARTBEAT_INTERVAL_MS = 15_000;

interface UseTelemetriaPresenceParams {
  enabled: boolean;
  isPaused?: boolean;
  pauseUntil?: string | null;
  user?: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

function ensureTabId(): string {
  const key = 'gmx_telemetria_tab_id';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const generated = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(key, generated);
  return generated;
}

export function determineTelemetryTabState(): TelemetryTabState {
  if (document.visibilityState === 'hidden') return 'TAB_ACTIVE_HIDDEN';
  if (document.hasFocus()) return 'TAB_ACTIVE_FOCUSED';
  return 'TAB_ACTIVE_VISIBLE_UNFOCUSED';
}

export function useTelemetriaPresence({
  enabled,
  isPaused = false,
  pauseUntil = null,
  user,
}: UseTelemetriaPresenceParams) {
  const tabId = useMemo(() => ensureTabId(), []);
  const lastStateRef = useRef<TelemetryTabState>(determineTelemetryTabState());
  const [tabState, setTabState] = useState<TelemetryTabState>(determineTelemetryTabState);

  const userName = useMemo(() => {
    if (!user) return 'Usuário';
    const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return full || user.email || 'Usuário';
  }, [user]);

  useEffect(() => {
    if (!enabled || !user?.id) return;

    const emit = async (eventType: string, overrideState?: TelemetryTabState) => {
      const state = overrideState ?? determineTelemetryTabState();
      setTabState(state);
      await writeTelemetryEvent({
        eventType: eventType as any,
        tabState: state,
        tabId,
        directusUserId: user.id,
        userEmail: user.email,
        userName,
        currentPath: window.location.pathname + window.location.search,
        metadata: {
          is_online: navigator.onLine,
          visibility_state: document.visibilityState,
          has_focus: document.hasFocus(),
          user_agent: navigator.userAgent,
          duty_active: true,
          duty_status: isPaused ? 'pausado' : 'trabalhando',
          pause_until: pauseUntil,
        },
      });
      lastStateRef.current = state;
    };

    void emit('init');

    const onVisibility = () => {
      const next = determineTelemetryTabState();
      setTabState(next);
      if (next !== lastStateRef.current) void emit('visibility_change', next);
    };
    const onFocus = () => {
      const next = determineTelemetryTabState();
      setTabState(next);
      if (next !== lastStateRef.current) void emit('focus', next);
    };
    const onBlur = () => {
      const next = determineTelemetryTabState();
      setTabState(next);
      if (next !== lastStateRef.current) void emit('blur', next);
    };
    const onOnline = () => void emit('online', determineTelemetryTabState());
    const onOffline = () => void emit('offline', 'TAB_ACTIVE_HIDDEN');
    const onBeforeUnload = () => {
      void emit('shutdown', 'TAB_PROBABLY_CLOSED');
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeunload', onBeforeUnload);

    const heartbeatTimer = setInterval(() => {
      void emit('heartbeat');
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [enabled, isPaused, pauseUntil, user?.id, user?.email, userName, tabId]);

  // Atualiza estado visual da aba mesmo fora do plantão (para o header).
  useEffect(() => {
    const sync = () => setTabState(determineTelemetryTabState());
    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('blur', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('blur', sync);
    };
  }, []);

  const trackCustomActivity = async (
    activityType: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!user?.id) return;
    const state = determineTelemetryTabState();
    await writeTelemetryEvent({
      eventType: 'activity',
      tabState: state,
      tabId,
      directusUserId: user.id,
      userEmail: user.email,
      userName,
      currentPath: window.location.pathname + window.location.search,
      metadata: {
        activity_type: activityType,
        duty_active: enabled,
        duty_status: isPaused ? 'pausado' : enabled ? 'trabalhando' : 'inativo',
        pause_until: pauseUntil,
        ...metadata,
      },
    });
  };

  return { tabId, tabState, trackCustomActivity };
}
