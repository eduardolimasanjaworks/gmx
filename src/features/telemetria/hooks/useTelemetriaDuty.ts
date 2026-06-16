/**
 * @module telemetria/hooks/useTelemetriaDuty
 * @purpose Plantão ativo/pausado (equivalente ao duty toggle da referência).
 */

import { useCallback, useEffect, useState } from 'react';
import { writeTelemetryEvent } from '../services/telemetry-store';
import { determineTelemetryTabState } from './useTelemetriaPresence';

const STORAGE_DUTY_KEY = 'gmx_telemetria_duty_active';
const STORAGE_PAUSE_UNTIL_KEY = 'gmx_telemetria_pause_until';

export type DutyVisualState = 'inativo' | 'trabalhando' | 'pausado';

interface UseTelemetriaDutyParams {
  user?: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  tabId: string;
}

function readDutyActive(): boolean {
  try {
    return localStorage.getItem(STORAGE_DUTY_KEY) === '1';
  } catch {
    return false;
  }
}

function readPauseUntil(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_PAUSE_UNTIL_KEY);
    if (!raw) return null;
    if (new Date(raw).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_PAUSE_UNTIL_KEY);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

function userNameOf(user: UseTelemetriaDutyParams['user']) {
  if (!user) return 'Usuário';
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || user.email || 'Usuário';
}

export function useTelemetriaDuty({ user, tabId }: UseTelemetriaDutyParams) {
  const [isDutyActive, setIsDutyActive] = useState(readDutyActive);
  const [pauseUntil, setPauseUntil] = useState<string | null>(readPauseUntil);
  const [nowTick, setNowTick] = useState(Date.now());

  const isPaused =
    Boolean(pauseUntil) && new Date(pauseUntil as string).getTime() > nowTick;

  const visualState: DutyVisualState = !isDutyActive
    ? 'inativo'
    : isPaused
      ? 'pausado'
      : 'trabalhando';

  const emitDutyEvent = useCallback(
    async (eventType: string, metadata?: Record<string, unknown>) => {
      if (!user?.id) return;
      await writeTelemetryEvent({
        eventType: 'activity',
        tabState: determineTelemetryTabState(),
        tabId,
        directusUserId: user.id,
        userEmail: user.email,
        userName: userNameOf(user),
        currentPath: window.location.pathname + window.location.search,
        metadata: {
          duty_active: isDutyActive,
          duty_status: visualState,
          pause_until: pauseUntil,
          ...metadata,
        },
      });
    },
    [user, tabId, isDutyActive, visualState, pauseUntil],
  );

  useEffect(() => {
    if (!pauseUntil) return;
    const timer = setInterval(() => {
      const ts = new Date(pauseUntil).getTime();
      if (ts <= Date.now()) {
        try {
          localStorage.removeItem(STORAGE_PAUSE_UNTIL_KEY);
        } catch {
          /* noop */
        }
        setPauseUntil(null);
        void emitDutyEvent('duty_pause_ended', { duty_status: 'trabalhando' });
      }
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [pauseUntil, emitDutyEvent]);

  const startDuty = useCallback(async () => {
    setIsDutyActive(true);
    setPauseUntil(null);
    try {
      localStorage.setItem(STORAGE_DUTY_KEY, '1');
      localStorage.removeItem(STORAGE_PAUSE_UNTIL_KEY);
    } catch {
      /* noop */
    }
    await emitDutyEvent('duty_start', { duty_status: 'trabalhando', duty_active: true });
  }, [emitDutyEvent]);

  const stopDuty = useCallback(async () => {
    setIsDutyActive(false);
    setPauseUntil(null);
    try {
      localStorage.removeItem(STORAGE_DUTY_KEY);
      localStorage.removeItem(STORAGE_PAUSE_UNTIL_KEY);
    } catch {
      /* noop */
    }
    await writeTelemetryEvent({
      eventType: 'shutdown',
      tabState: 'TAB_PROBABLY_CLOSED',
      tabId,
      directusUserId: user?.id,
      userEmail: user?.email,
      userName: userNameOf(user),
      currentPath: window.location.pathname + window.location.search,
      metadata: { duty_status: 'inativo', duty_active: false },
    });
  }, [tabId, user]);

  const startPause = useCallback(
    async (minutes: number) => {
      if (!isDutyActive) return;
      const until = new Date(Date.now() + minutes * 60_000).toISOString();
      setPauseUntil(until);
      try {
        localStorage.setItem(STORAGE_PAUSE_UNTIL_KEY, until);
      } catch {
        /* noop */
      }
      await emitDutyEvent('duty_pause', {
        duty_status: 'pausado',
        pause_minutes: minutes,
        pause_until: until,
      });
    },
    [isDutyActive, emitDutyEvent],
  );

  const cancelPause = useCallback(async () => {
    setPauseUntil(null);
    try {
      localStorage.removeItem(STORAGE_PAUSE_UNTIL_KEY);
    } catch {
      /* noop */
    }
    await emitDutyEvent('duty_resume', { duty_status: 'trabalhando' });
  }, [emitDutyEvent]);

  const pauseRemainingMs = isPaused && pauseUntil
    ? Math.max(0, new Date(pauseUntil).getTime() - nowTick)
    : 0;

  return {
    isDutyActive,
    isPaused,
    pauseUntil,
    pauseRemainingMs,
    visualState,
    startDuty,
    stopDuty,
    startPause,
    cancelPause,
  };
}
