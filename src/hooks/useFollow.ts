import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { directus } from "@/lib/directus";
import { readItems, createItems, deleteItems } from "@directus/sdk";
import { useAuth } from "@/context/AuthContext";

export interface FollowItem {
    id: number;
    pedido: string;
    origem: string;
    destino: string;
    uf: string;
    cliente: string;
    tp: string;        // Transportadora
    produto: string;
    status: string;
    date_created?: string;
    date_updated?: string;
}

export function useFollow() {
    const queryClient = useQueryClient();
    const { refreshToken } = useAuth();

    const ensureToken = async () => {
        const storedToken = localStorage.getItem('directus_token');
        if (storedToken) {
            await directus.setToken(storedToken);
        }
    };

    // Fetch all follow items
    const { data: followItems = [], isLoading, error } = useQuery({
        queryKey: ['follow'],
        queryFn: async () => {
            await ensureToken();
            try {
                const items = await directus.request(readItems('follow', {
                    fields: ['*'],
                    limit: -1
                }));
                return items as FollowItem[];
            } catch (err: any) {
                if (err?.message?.includes('expired') || err?.response?.status === 401 || err?.status === 401) {
                    try {
                        await refreshToken();
                        const items = await directus.request(readItems('follow', {
                            fields: ['*'],
                            sort: ['-date_created'],
                            limit: -1
                        }));
                        return items as FollowItem[];
                    } catch (refreshErr) {
                        console.error("Error refreshing token:", refreshErr);
                        throw err;
                    }
                }
                console.error("Error fetching follow items:", err);
                throw err;
            }
        },
        refetchInterval: 15000 // refresh a cada 15 segundos
    });

    // Mutation: insert multiple items (batch import from CSV)
    const importFollowMutation = useMutation({
        mutationFn: async (payload: Omit<FollowItem, 'id'>[]) => {
            await ensureToken();
            try {
                return await directus.request(createItems('follow', payload));
            } catch (err: any) {
                if (err?.message?.includes('expired') || err?.response?.status === 401 || err?.status === 401) {
                    const newToken = await refreshToken();
                    await directus.setToken(newToken);
                    return await directus.request(createItems('follow', payload));
                }
                throw err;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['follow'] });
        },
        onError: (err) => {
            console.error("Error importing follow batch:", err);
        }
    });

    // Mutation: delete all items
    const deleteAllFollowMutation = useMutation({
        mutationFn: async () => {
            await ensureToken();
            const items = await directus.request(readItems('follow', { fields: ['id'], limit: -1 }));
            const ids = items.map((i: any) => i.id);
            if (ids.length > 0) {
                await directus.request(deleteItems('follow', ids));
            }
            return ids.length;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['follow'] });
        }
    });

    return {
        followItems,
        isLoading,
        error,
        importFollow: (payload: Omit<FollowItem, 'id'>[]) => importFollowMutation.mutateAsync(payload),
        deleteAllFollow: () => deleteAllFollowMutation.mutateAsync(),
        isImporting: importFollowMutation.isPending
    };
}
