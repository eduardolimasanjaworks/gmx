import { useQuery, useQueryClient } from '@tanstack/react-query';
import { directus } from '@/lib/directus';
import { createItem, deleteItem, readItems, updateItem } from '@directus/sdk';
import { toast } from 'sonner';

export interface TelefoneNotificacao {
  id: number;
  nome: string;
  telefone: string;
  ativo?: boolean;
  observacao?: string;
}

export function useTelefonesNotificacao() {
  const queryClient = useQueryClient();

  const { data: telefones = [], isLoading } = useQuery({
    queryKey: ['telefones_notificacao'],
    queryFn: async () => {
      const rows = await directus.request(
        readItems('telefones_notificacao', { sort: ['nome'], limit: -1 }),
      );
      return rows as TelefoneNotificacao[];
    },
  });

  const createTelefone = async (input: Omit<TelefoneNotificacao, 'id'>) => {
    await directus.request(
      createItem('telefones_notificacao', { ...input, ativo: input.ativo ?? true }),
    );
    toast.success('Telefone adicionado');
    queryClient.invalidateQueries({ queryKey: ['telefones_notificacao'] });
  };

  const updateTelefone = async (id: number, input: Partial<TelefoneNotificacao>) => {
    await directus.request(updateItem('telefones_notificacao', id, input));
    toast.success('Telefone atualizado');
    queryClient.invalidateQueries({ queryKey: ['telefones_notificacao'] });
  };

  const deleteTelefone = async (id: number) => {
    await directus.request(deleteItem('telefones_notificacao', id));
    toast.success('Telefone removido');
    queryClient.invalidateQueries({ queryKey: ['telefones_notificacao'] });
  };

  return { telefones, isLoading, createTelefone, updateTelefone, deleteTelefone };
}
