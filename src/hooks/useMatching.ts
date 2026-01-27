import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicDirectus } from '@/lib/directus';
import { readItems, createItem } from '@directus/sdk';
import { calcularMatchingScore, MatchingScore } from '@/lib/matchingAlgorithm';

/**
 * Hook para buscar sugestões de matching para um embarque
 */
export function useMatchingSuggestions(embarqueId: string | null) {
    return useQuery({
        queryKey: ['matching-suggestions', embarqueId],
        queryFn: async () => {
            if (!embarqueId) return [];

            // 1. Buscar dados do embarque
            const embarques = await publicDirectus.request(
                readItems('embarques', {
                    filter: { id: { _eq: embarqueId } },
                    fields: ['*'],
                })
            );

            if (!embarques || embarques.length === 0) {
                throw new Error('Embarque não encontrado');
            }

            const embarque = embarques[0];

            // 2. Buscar motoristas disponíveis ou que ficarão disponíveis em breve
            const motoristas = await publicDirectus.request(
                readItems('cadastro_motorista', {
                    fields: [
                        'id',
                        'nome',
                        'sobrenome',
                        'telefone',
                        'cidade',
                        'estado',
                    ],
                    filter: {
                        status: { _eq: 'active' },
                    },
                    limit: 100,
                })
            );

            // 3. Buscar disponibilidade de cada motorista
            const disponibilidades = await publicDirectus.request(
                readItems('disponivel', {
                    fields: ['*'],
                    sort: ['-date_created'],
                    limit: 1000,
                })
            );

            // Mapear última disponibilidade por motorista
            const dispMap = new Map();
            for (const disp of disponibilidades) {
                const mId = typeof disp.motorista_id === 'object'
                    ? (disp.motorista_id as any)?.id
                    : disp.motorista_id;
                if (mId && !dispMap.has(mId)) {
                    dispMap.set(mId, disp);
                }
            }

            // 4. Calcular score para cada motorista
            const scores: MatchingScore[] = [];

            for (const motorista of motoristas) {
                const disp = dispMap.get(motorista.id);

                const motoristaData = {
                    id: motorista.id,
                    nome: `${motorista.nome} ${motorista.sobrenome || ''}`.trim(),
                    localizacao_atual: disp?.localizacao_atual || `${motorista.cidade}, ${motorista.estado}`,
                    latitude: disp?.latitude,
                    longitude: disp?.longitude,
                    status: disp?.status || 'indisponivel',
                    disponivel_em: disp?.disponivel_em,
                    tipo_veiculo: 'Carreta', // TODO: buscar do cadastro de veículo
                    capacidade_kg: 30000, // TODO: buscar do cadastro
                    historico_rotas: [], // TODO: calcular do histórico
                    viagens_concluidas: 0, // TODO: contar embarques concluídos
                    taxa_aceite: 85, // TODO: calcular
                    gr_aprovada: true, // TODO: verificar
                };

                const embarqueData = {
                    id: embarque.id,
                    origin: embarque.origin || '',
                    destination: embarque.destination || '',
                    produto_predominante: embarque.produto_predominante || '',
                    tipo_carga: embarque.tipo_carga || 'geral',
                    peso_total: embarque.peso_total,
                    valor_frete: embarque.total_value,
                    data_coleta: embarque.pickup_date || embarque.created_at,
                    urgencia: 'media' as const,
                };

                const score = calcularMatchingScore(embarqueData, motoristaData);
                scores.push(score);
            }

            // 5. Ordenar por score total (maior primeiro)
            scores.sort((a, b) => b.score_total - a.score_total);

            // 6. Retornar top 10
            return scores.slice(0, 10);
        },
        enabled: !!embarqueId,
        staleTime: 1000 * 60 * 5, // 5 minutos
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
            // Buscar embarques pendentes ou aguardando motorista
            const embarques = await publicDirectus.request(
                readItems('embarques', {
                    filter: {
                        status: { _in: ['pending', 'awaiting_driver'] },
                    },
                    fields: ['*'],
                    sort: ['-created_at'],
                    limit: 50,
                })
            );

            return embarques;
        },
        refetchInterval: 1000 * 60 * 2, // Atualiza a cada 2 minutos
    });
}
