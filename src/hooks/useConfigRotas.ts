import { useQuery, useQueryClient } from '@tanstack/react-query';
import { directus } from '@/lib/directus';
import { createItem, deleteItem, readItems, updateItem } from '@directus/sdk';
import { toast } from 'sonner';

export interface ConfigRota {
  id: number;
  origem: string;
  destino: string;
  operacao?: string;
  operacao_id?: number | null;
  valor_minimo: number;
  valor_maximo: number;
  ativo?: boolean;
}

export type ConfigRotaInput = Omit<ConfigRota, 'id'>;

export function useConfigRotas() {
  const queryClient = useQueryClient();

  const { data: rotas = [], isLoading } = useQuery({
    queryKey: ['config_rotas'],
    queryFn: async () => {
      const rows = await directus.request(
        readItems('config_rotas', { sort: ['origem', 'destino'], limit: -1 }),
      );
      return rows as ConfigRota[];
    },
  });

  const createRota = async (input: ConfigRotaInput) => {
    await directus.request(
      createItem('config_rotas', {
        ...input,
        operacao: input.operacao?.toUpperCase(),
        ativo: input.ativo ?? true,
      }),
    );
    toast.success('Rota criada');
    queryClient.invalidateQueries({ queryKey: ['config_rotas'] });
  };

  const updateRota = async (id: number, input: Partial<ConfigRotaInput>) => {
    await directus.request(updateItem('config_rotas', id, input));
    toast.success('Rota atualizada');
    queryClient.invalidateQueries({ queryKey: ['config_rotas'] });
  };

  const deleteRota = async (id: number) => {
    await directus.request(deleteItem('config_rotas', id));
    toast.success('Rota removida');
    queryClient.invalidateQueries({ queryKey: ['config_rotas'] });
  };

  return { rotas, isLoading, createRota, updateRota, deleteRota };
}
