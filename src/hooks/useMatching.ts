import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicDirectus } from '@/lib/directus';
import { createItem, readItems } from '@directus/sdk';
import { rankMotoristasParaEmbarque } from '@/lib/rankMotoristas';
import type { MatchingScore } from '@/lib/matchingAlgorithm';

/**
 * Hook para buscar sugestões de matching para um embarque
 */
export function useMatchingSuggestions(embarqueId: string | null) {
    return useQuery({
        queryKey: ['matching-suggestions', embarqueId],
        queryFn: async () => {
            if (!embarqueId) return [];

            const embarques = await publicDirectus.request(
                readItems('embarques', {
                    filter: { id: { _eq: embarqueId } },
                    fields: ['*'],
                })
            );

            if (!embarques || embarques.length === 0) {
                throw new Error('Embarque não encontrado');
            }

            return rankMotoristasParaEmbarque(embarques[0], 10);
        },
        enabled: !!embarqueId,
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook para salvar score de matching no banco
 */
export function useSaveMatchingScore() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            embarqueId,
            motoristaId,
            score,
        }: {
            embarqueId: string;
            motoristaId: string;
            score: MatchingScore;
        }) => {
            await publicDirectus.request(
                createItem('matching_scores' as any, {
                    embarque_id: embarqueId,
                    motorista_id: motoristaId,
                    score_total: score.score_total,
                    score_disponibilidade: score.score_disponibilidade,
                    score_equipamento: score.score_equipamento,
                    score_localizacao: score.score_localizacao,
                    score_historico: score.score_historico,
                    score_comercial: score.score_comercial,
                    justificativa: score.justificativa,
                })
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching-suggestions'] });
        },
    });
}

/**
 * Hook para buscar todos os embarques que precisam de matching
 */
export function useEmbarquesNeedingMatch() {
    return useQuery({
        queryKey: ['embarques-needing-match'],
        queryFn: async () => {
            const embarques = await publicDirectus.request(
                readItems('embarques', {
                    filter: {
                        status: { _in: ['new', 'needs_attention'] },
                    },
                    fields: ['*'],
                    sort: ['-date_created'],
                    limit: 50,
                })
            );

            return embarques;
        },
        refetchInterval: 1000 * 60 * 2,
    });
}
