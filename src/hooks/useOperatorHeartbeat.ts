import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTelemetriaDuty } from "@/features/telemetria/hooks/useTelemetriaDuty";
import { useTelemetriaPresence } from "@/features/telemetria/hooks/useTelemetriaPresence";

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

export function useOperatorHeartbeat() {
  const { user } = useAuth();
  const tabId = useMemo(() => ensureTabId(), []);

  const userPayload = user
    ? {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      }
    : null;

  const duty = useTelemetriaDuty({
    user: userPayload,
    tabId,
  });

  const { tabState, trackCustomActivity } = useTelemetriaPresence({
    enabled: duty.isDutyActive,
    isPaused: duty.isPaused,
    pauseUntil: duty.pauseUntil,
    user: userPayload,
  });

  const trackActivity = async (
    activityType: string,
    entityId?: string,
    entityType?: string,
    metadata?: Record<string, any>
  ) => {
    await trackCustomActivity(activityType, {
      entity_id: entityId,
      entity_type: entityType,
      ...metadata,
    });
  };

  return {
    ...duty,
    tabState,
    trackActivity,
  };
}
