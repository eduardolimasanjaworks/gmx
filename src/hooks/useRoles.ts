
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { directus } from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { toast } from "sonner";

export interface AppRole {
    id: number;
    name: string;
    description?: string;
    permissions: string[]; // Stored as JSON []
    color?: string;
    created_at?: string;
}

export function useRoles() {
    const queryClient = useQueryClient();

    const { data: roles = [], isLoading } = useQuery({
        queryKey: ['app_roles'],
        queryFn: async () => {
            try {
                const response = await directus.request(readItems('app_roles', {
                    sort: ['name' as any]
                }));
                return response as AppRole[];
            } catch (error) {
                console.error("Error fetching roles:", error);
                return [];
            }
        },
    });

    const createRole = async (role: Omit<AppRole, 'id' | 'created_at'>) => {
        try {
            await directus.request(createItem('app_roles', role));
            toast.success('Cargo criado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['app_roles'] });
        } catch (error) {
            console.error("Error creating role:", error);
            toast.error('Erro ao criar cargo');
            throw error;
        }
    };

    const updateRole = async (id: number, role: Partial<AppRole>) => {
        try {
            await directus.request(updateItem('app_roles', id, role));
            toast.success('Cargo atualizado!');
            queryClient.invalidateQueries({ queryKey: ['app_roles'] });
        } catch (error) {
            console.error("Error updating role:", error);
            toast.error('Erro ao atualizar cargo');
            throw error;
        }
    };

    const deleteRole = async (id: number) => {
        try {
            await directus.request(deleteItem('app_roles', id));
            toast.success('Cargo removido!');
            queryClient.invalidateQueries({ queryKey: ['app_roles'] });
        } catch (error) {
            console.error("Error deleting role:", error);
            toast.error('Erro ao remover cargo');
            throw error;
        }
    };

    return {
        roles,
        isLoading,
        createRole,
        updateRole,
        deleteRole
    };
}
