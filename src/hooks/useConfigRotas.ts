import { useQuery, useQueryClient } from '@tanstack/react-query';
import { directus } from '@/lib/directus';
import { createItem, deleteItem, readItems, updateItem } from '@directus/sdk';
import { toast } from 'sonner';

export interface ConfigRota {
  id: number;
  origem: string;
  destino: string;
  origem_latitude?: number | null;
  origem_longitude?: number | null;
  destino_latitude?: number | null;
  destino_longitude?: number | null;
  operacao?: string;
  operacao_id?: number | null;
  valor_minimo: number;
  valor_maximo: number;
  ativo?: boolean;
  fonte_planilha?: string | null;
  especie_produto?: string | null;
  origem_regiao?: string | null;
  uf_origem?: string | null;
  uf_destino?: string | null;
  capacidade?: string | null;
  distancia_km?: number | null;
  frete_peso_cargox?: number | null;
  frete_bruto_icms?: number | null;
  frete_pis_cofins?: number | null;
  frete_liquido_cargox?: number | null;
  contrato_frete_gmx?: number | null;
  frete_peso_terceiro?: number | null;
  total_terceiro?: number | null;
  km_rodado_frete_atual?: number | null;
  icms?: string | null;
  real_pallet_atual?: number | null;
  evidencia?: string | null;
  status_tarifa?: string | null;
  km_rodado_terceiro?: number | null;
  frete_terceiro_padrao?: number | null;
  frete_terceiro_maximo?: number | null;
  preferencia_proximidade?: 'agora' | 'coleta' | null;
  gps_max_horas?: number | null;
  passo_negociacao_modo?: 'proporcional' | 'fixo' | null;
  passo_negociacao_valor?: number | null;
  escalar_humano_no_teto?: boolean | null;
}

export type ConfigRotaInput = Omit<ConfigRota, 'id'>;

function aplicarDefaultsRegras(input: Partial<ConfigRotaInput>): Partial<ConfigRotaInput> {
  return {
    preferencia_proximidade: input.preferencia_proximidade ?? 'coleta',
    gps_max_horas: input.gps_max_horas ?? 24,
    passo_negociacao_modo: input.passo_negociacao_modo ?? 'proporcional',
    passo_negociacao_valor: input.passo_negociacao_valor ?? 100,
    escalar_humano_no_teto: input.escalar_humano_no_teto ?? true,
  };
}

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
        ...aplicarDefaultsRegras(input),
        operacao: input.operacao?.toUpperCase(),
        ativo: input.ativo ?? true,
      }),
    );
    toast.success('Rota criada');
    queryClient.invalidateQueries({ queryKey: ['config_rotas'] });
  };

  const updateRota = async (id: number, input: Partial<ConfigRotaInput>) => {
    await directus.request(
      updateItem('config_rotas', id, {
        ...input,
        ...aplicarDefaultsRegras(input),
        operacao: input.operacao?.toUpperCase(),
      }),
    );
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
