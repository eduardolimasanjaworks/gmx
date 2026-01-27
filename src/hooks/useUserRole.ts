import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "responsavel" | "user" | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetchUserRole();

    const channel = supabase
      .channel('user-role-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => {
          fetchUserRole();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setCanEdit(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole("user");
        setCanEdit(false);
      } else if (data) {
        setRole(data.role as UserRole);
        setCanEdit(data.role === "admin" || data.role === "responsavel");
      } else {
        setRole("user");
        setCanEdit(false);
      }
    } catch (error) {
      console.error("Error in fetchUserRole:", error);
      setRole(null);
      setCanEdit(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    role,
    canEdit,
    isLoading,
    isAdmin: role === "admin",
    isResponsavel: role === "responsavel",
    refetch: fetchUserRole
  };
};
