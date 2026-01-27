import { useQuery, useQueryClient } from "@tanstack/react-query";
import { directus } from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { useEffect } from "react";
import { toast } from "sonner";

export interface VehicleMatch {
  id: string;
  embarque_id: string;
  driver_id: string;
  compatibility_score: number;
  compatibility_level: 'high' | 'medium' | 'low';
  factors: Record<string, any>;
  status: 'suggested' | 'offered' | 'accepted' | 'rejected';
  offered_at?: string;
  response_at?: string;
  created_at: string;
  driver?: any;
  embarque?: any;
}

export function useVehicleMatching(embarqueId?: string) {
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['vehicle_matching', embarqueId],
    queryFn: async () => {
      try {
        const filter: any = {};
        if (embarqueId) filter.embarque_id = { _eq: embarqueId };

        const response = await directus.request(readItems('vehicle_matches', {
          filter,
          fields: ['*', 'driver_id.*', 'embarque_id.*'],
          sort: ['-compatibility_score' as any]
        }));

        return response.map((m: any) => ({
          ...m,
          driver: m.driver_id ? { ...m.driver_id, name: m.driver_id.nome } : undefined, // Map driver_id to driver object
          embarque: m.embarque_id
        })) as VehicleMatch[];

      } catch (err) {
        console.error("Error fetching matches:", err);
        return [];
      }
    },
    enabled: !!embarqueId || embarqueId === undefined,
  });

  const createMatch = async (match: Omit<VehicleMatch, 'id' | 'created_at'>) => {
    try {
      await directus.request(createItem('vehicle_matches', {
        ...match,
        driver_id: parseInt(match.driver_id), // Ensure INT
        embarque_id: parseInt(match.embarque_id) // Ensure INT
      }));
      toast.success('Match criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['vehicle_matching'] });
    } catch (err) {
      console.error("Error creating match:", err);
      toast.error('Erro ao criar match');
    }
  };

  const updateMatchStatus = async (matchId: string, status: VehicleMatch['status']) => {
    try {
      await directus.request(updateItem('vehicle_matches', matchId, { status }));
      toast.success('Status do match atualizado!');
      queryClient.invalidateQueries({ queryKey: ['vehicle_matching'] });
    } catch (err) {
      console.error("Error updating match:", err);
      toast.error('Erro ao atualizar match');
    }
  };

  const highMatches = matches.filter(m => m.compatibility_level === 'high');
  const mediumMatches = matches.filter(m => m.compatibility_level === 'medium');
  const lowMatches = matches.filter(m => m.compatibility_level === 'low');

  return {
    matches,
    highMatches,
    mediumMatches,
    lowMatches,
    isLoading,
    createMatch,
    updateMatchStatus,
  };
}
