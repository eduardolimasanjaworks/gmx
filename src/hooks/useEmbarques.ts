import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { directus } from "@/lib/directus";
import { readItems, updateItem, createItems } from "@directus/sdk";
import { useEffect } from "react";
import { Embarque, EmbarqueStatus, transformEmbarqueToCard } from "@/types/embarque";
import { useAuth } from "@/context/AuthContext";

export function useEmbarques() {
  const queryClient = useQueryClient();
  const { refreshToken } = useAuth();

  const { data: embarques = [], isLoading, error } = useQuery({
    queryKey: ['embarques'],
    queryFn: async () => {
      try {
        const response = await directus.request(readItems('embarques', {
          fields: ['*', 'driver_id.*']
          // sort: ['-date_created'] // Removido pois causa erro de permissão. Ordenação feita no cliente.
        }));

        const items = response.map((item: any) => ({
          ...item,
          // Mapeia date_created do Directus para created_at da aplicação
          // Fallback para pickup_date ou data atual se não existir date_created
          created_at: item.date_created || item.pickup_date || new Date().toISOString(),
          // Garante que o ID seja uma string
          id: String(item.id),
          driver: item.driver_id ? {
            id: item.driver_id.id,
            name: item.driver_id.name || item.driver_id.nome || 'Motorista'
          } : undefined,
          // Normaliza driver_id para string se for objeto
          driver_id: typeof item.driver_id === 'object' ? item.driver_id?.id : item.driver_id
        })) as any[];

        // Ordenação Client-side (do mais recente para o mais antigo)
        return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } catch (err: any) {
        // Se o erro for 401 (token expirado), tenta renovar o token
        if (err?.message?.includes('expired') || err?.response?.status === 401 || err?.status === 401) {
          try {
            await refreshToken();
            // Retry a requisição após renovar o token
            const response = await directus.request(readItems('embarques', {
              fields: ['*', 'driver_id.*']
            }));
            const items = response.map((item: any) => ({
              ...item,
              created_at: item.date_created || item.pickup_date || new Date().toISOString(),
              id: String(item.id),
              driver: item.driver_id ? {
                id: item.driver_id.id,
                name: item.driver_id.name || item.driver_id.nome || 'Motorista'
              } : undefined,
              driver_id: typeof item.driver_id === 'object' ? item.driver_id?.id : item.driver_id
            })) as any[];
            return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          } catch (refreshErr) {
            console.error("Error refreshing token:", refreshErr);
            throw err; // Re-throw original error
          }
        }
        console.error("Error fetching embarques:", err);
        throw err;
      }
    },
    refetchInterval: 5000,
  });

  // Realtime subscription removed for mock mode
  useEffect(() => { }, []);

  // Group embarques by status
  const embarquesByStatus = embarques.reduce((acc, embarque) => {
    const status = embarque.status as EmbarqueStatus;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(transformEmbarqueToCard(embarque));
    return acc;
  }, {} as Record<EmbarqueStatus, ReturnType<typeof transformEmbarqueToCard>[]>);

  // Mutation for updating status with Optimistic Updates
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: EmbarqueStatus }) => {
      try {
        await directus.request(updateItem('embarques', id, {
          status: newStatus
        }));
        return { id, newStatus };
      } catch (err: any) {
        // Se o erro for 401 (token expirado), tenta renovar o token
        if (err?.message?.includes('expired') || err?.response?.status === 401 || err?.status === 401) {
          try {
            await refreshToken();
            // Retry a requisição após renovar o token
            await directus.request(updateItem('embarques', id, {
              status: newStatus
            }));
            return { id, newStatus };
          } catch (refreshErr) {
            console.error("Error refreshing token:", refreshErr);
            throw err; // Re-throw original error
          }
        }
        throw err;
      }
    },
    // When mutate is called:
    onMutate: async ({ id, newStatus }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['embarques'] });

      // Snapshot the previous value
      const previousEmbarques = queryClient.getQueryData<any[]>(['embarques']);

      // Optimistically update to the new value
      queryClient.setQueryData(['embarques'], (old: any[] = []) => {
        return old.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        );
      });

      // Return a context object with the snapshotted value
      return { previousEmbarques };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      if (context?.previousEmbarques) {
        queryClient.setQueryData(['embarques'], context.previousEmbarques);
      }
      console.error("Error updating status:", err);
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['embarques'] });
    },
  });

  // Mutation for creating multiple embarques (batch insert)
  const createEmbarquesBatchMutation = useMutation({
    mutationFn: async (payload: any[]) => {
      try {
        const response = await directus.request(createItems('embarques', payload));
        return response;
      } catch (err: any) {
        if (err?.message?.includes('expired') || err?.response?.status === 401 || err?.status === 401) {
          try {
            await refreshToken();
            const response = await directus.request(createItems('embarques', payload));
            return response;
          } catch (refreshErr) {
            console.error("Error refreshing token during batch insert:", refreshErr);
            throw err;
          }
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['embarques'] });
    },
    onError: (err) => {
      console.error("Error inserting embarques batch:", err);
    }
  });

  return {
    embarques,
    embarquesByStatus,
    isLoading,
    error,
    updateStatus: (id: string, newStatus: EmbarqueStatus) =>
      updateStatusMutation.mutateAsync({ id, newStatus }),
    createEmbarquesBatch: async (payload: any[]) =>
      createEmbarquesBatchMutation.mutateAsync(payload)
  };
}
