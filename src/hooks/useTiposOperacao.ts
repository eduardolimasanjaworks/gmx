import { useQuery, useQueryClient } from '@tanstack/react-query';
import { directus } from '@/lib/directus';
import { createItem, deleteItem, readItems, updateItem } from '@directus/sdk';
import { toast } from 'sonner';

export interface TipoOperacao {
  id: number;
  nome: string;
  ativo?: boolean;
}

export function useTiposOperacao() {
  const queryClient = useQueryClient();

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ['tipos_operacao'],
    queryFn: async () => {
      try {
        const rows = await directus.request(
          readItems('tipos_operacao', { sort: ['nome'], limit: -1 }),
        );
        return rows as TipoOperacao[];
      } catch (error) {
        // #region debug-point D:tipos-operacao-read-error
        fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'gmx-iagmx-integration', runId: 'pre-fix', hypothesisId: 'D', location: 'gmx/src/hooks/useTiposOperacao.ts:queryFn', msg: '[DEBUG] Directus negou leitura de tipos_operacao', data: { error: error instanceof Error ? error.message : String(error) }, ts: Date.now() }) }).catch(() => {});
        // #endregion
        throw error;
      }
    },
  });

  const createTipo = async (nome: string) => {
    await directus.request(createItem('tipos_operacao', { nome: nome.toUpperCase(), ativo: true }));
    toast.success('Operação adicionada');
    queryClient.invalidateQueries({ queryKey: ['tipos_operacao'] });
  };

  const toggleTipo = async (id: number, ativo: boolean) => {
    await directus.request(updateItem('tipos_operacao', id, { ativo }));
    queryClient.invalidateQueries({ queryKey: ['tipos_operacao'] });
  };

  const deleteTipo = async (id: number) => {
    await directus.request(deleteItem('tipos_operacao', id));
    toast.success('Operação removida');
    queryClient.invalidateQueries({ queryKey: ['tipos_operacao'] });
  };

  return { tipos, isLoading, createTipo, toggleTipo, deleteTipo };
}
