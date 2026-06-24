/**
 * Busca pendencias globais de validacao de documentos geradas pela IA.
 * Mantem a listagem fora do perfil individual do motorista.
 * Serve para a equipe revisar cadastro sem abrir motorista por motorista.
 */
import { useQuery } from '@tanstack/react-query';
import { directusAdminItems } from '@/lib/directus';

export interface DriverAiValidationItem {
  id: number;
  status: string;
  tipo_documento?: string | null;
  colecao_destino?: string | null;
  date_created?: string | null;
  confidence_score?: number | null;
  motorista_id?:
    | {
        id: number;
        nome?: string | null;
        sobrenome?: string | null;
        telefone?: string | null;
      }
    | number
    | null;
}

function nomeMotorista(item: DriverAiValidationItem): string {
  if (typeof item.motorista_id === 'object' && item.motorista_id) {
    return [item.motorista_id.nome, item.motorista_id.sobrenome].filter(Boolean).join(' ').trim();
  }
  return '';
}

export function useDriverAiValidationQueue() {
  return useQuery({
    queryKey: ['motorista-ocr-validacao-global'],
    queryFn: async () => {
      const rows = await directusAdminItems<DriverAiValidationItem>('motorista_ocr_sugestao', {
        fields: [
          'id',
          'status',
          'tipo_documento',
          'colecao_destino',
          'date_created',
          'confidence_score',
          'motorista_id.id',
          'motorista_id.nome',
          'motorista_id.sobrenome',
          'motorista_id.telefone',
        ].join(','),
        filter: JSON.stringify({ status: { _eq: 'pendente' } }),
        sort: '-date_created',
        limit: '30',
      });
      return (rows as DriverAiValidationItem[]).map((item) => ({
        ...item,
        nome_motorista: nomeMotorista(item),
      }));
    },
    refetchInterval: 30_000,
  });
}
