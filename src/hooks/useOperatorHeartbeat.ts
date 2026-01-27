// import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export function useOperatorHeartbeat() {
  const { toast } = useToast();

  useEffect(() => {
    console.log("Operator tracking started (MOCK)");
    const interval = setInterval(() => {
      console.log("Heartbeat sent (MOCK)");
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const trackActivity = async (
    activityType: string,
    entityId?: string,
    entityType?: string,
    metadata?: Record<string, any>
  ) => {
    console.log(`Activity tracked (MOCK): ${activityType}`, { entityId, entityType, metadata });
  };

  return { trackActivity };
}
