/**
 * Hook React Query da fila humana de ofertas.
 * Centraliza leitura e mutacoes para manter o portal simples.
 * O invalidate tambem atualiza o quadro de embarques apos cada acao.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assumirFilaHumanaOferta,
  listarFilaHumanaOferta,
  resolverFilaHumanaOferta,
} from '@/services/iagmxFilaHumanaOfertaService';
import { toast } from 'sonner';

export function useIagmxFilaHumanaOfertas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['iagmx', 'fila-humana-ofertas'],
    queryFn: listarFilaHumanaOferta,
    refetchInterval: 15000,
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['iagmx', 'fila-humana-ofertas'] }),
      queryClient.invalidateQueries({ queryKey: ['embarques'] }),
    ]);
  };

  const assumir = useMutation({
    mutationFn: (opts: { id: number; assumidoPor: string }) =>
      assumirFilaHumanaOferta(opts.id, opts.assumidoPor),
    onSuccess: async () => {
      toast.success('Caso assumido');
      await invalidateAll();
    },
  });

  const resolver = useMutation({
    mutationFn: resolverFilaHumanaOferta,
    onSuccess: async () => {
      toast.success('Caso resolvido');
      await invalidateAll();
    },
  });

  return {
    itens: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    assumirCaso: assumir.mutateAsync,
    resolverCaso: resolver.mutateAsync,
    isSaving: assumir.isPending || resolver.isPending,
  };
}
