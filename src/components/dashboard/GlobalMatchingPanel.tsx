import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { directus, publicDirectus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { Truck, MapPin, Calendar, TrendingUp, ArrowRight, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useVehicleMatching } from "@/hooks/useVehicleMatching";

import { assignDriver } from "@/lib/embarques";
import { CheckCircle } from "lucide-react";

export function GlobalMatchingPanel() {
  const { toast } = useToast();
  const { updateMatchStatus } = useVehicleMatching();
  const [offeringMatch, setOfferingMatch] = useState<string | null>(null);
  const [assigningMatch, setAssigningMatch] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Buscar todos os embarques aguardando
  const { data: pendingEmbarques = [], isLoading: loadingEmbarques } = useQuery({
    queryKey: ['pending-embarques-matching'],
    queryFn: async () => {
      try {
        const response = await publicDirectus.request(readItems('embarques', {
          filter: {
            driver_id: {
              _null: true
            },
            status: {
              _nin: ['delivered', 'cancelled', 'no_show']
            }
          },
          fields: ['id', 'status', 'origin', 'destination', 'delivery_window_end', 'client_name', 'cargo_type'],
          sort: ['-date_created'],
          limit: 20
        }));
        console.log("Global Matching Pendings:", response);
        return response;
      } catch (error) {
        console.error("Error fetching pending embarques for matching:", error);
        return [];
      }
    },
    refetchInterval: 30000
  });

  // Buscar matching para cada embarque
  const { matches: allMatches = [], isLoading: loadingMatches } = useVehicleMatching();

  const handleOfferMatch = async (matchId: string, embarqueId: string) => {
    setOfferingMatch(matchId);
    try {
      await updateMatchStatus(matchId, 'offered');
      toast({
        title: "Oferta enviada",
        description: "A oferta foi enviada para o motorista com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a oferta.",
        variant: "destructive",
      });
    } finally {
      setOfferingMatch(null);
    }
  };

  const handleAssignDriver = async (embarqueId: string, driverId: string, matchId: string) => {
    setAssigningMatch(matchId);
    try {
      await assignDriver(embarqueId, driverId);
      // Update match status to accepted as well
      await updateMatchStatus(matchId, 'accepted');

      toast({
        title: "Motorista Alocado",
        description: "Motorista atribuído à carga com sucesso.",
      });

      // Invalidate queries to refresh the list (remove pending embarque)
      queryClient.invalidateQueries({ queryKey: ['pending-embarques-matching'] });
    } catch (error) {
      toast({
        title: "Erro na alocação",
        description: "Não foi possível alocar o motorista.",
        variant: "destructive",
      });
    } finally {
      setAssigningMatch(null);
    }
  };

  const handleOfferAllMatches = async (embarqueId: string) => {
    // Logic placeholder
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Em breve disparará ofertas para todos os matches sugeridos.",
    });
  };

  if (loadingEmbarques) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando painel de matching...</div>;
  }

  if (pendingEmbarques.length === 0) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
          <p className="font-semibold text-green-600">Nenhum embarque aguardando matching</p>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as cargas foram atribuídas ou estão concluídas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Matching Automático Global - {pendingEmbarques.length} Cargas Sem Motorista
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Veículos sugeridos automaticamente para cargas pendentes de alocação de motorista
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {pendingEmbarques.map((embarque: any) => {
          // Filter matches for this specific embarque
          const embarqueMatches = allMatches.filter((m: any) =>
            // Handle both object and ID string cases for robustness
            (typeof m.embarque_id === 'object' ? m.embarque_id?.id : m.embarque_id) == embarque.id
          );

          return (
            <div key={embarque.id} className="border rounded-lg p-4 space-y-4 shadow-sm hover:shadow-md transition-all">
              {/* Embarque Info */}
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{embarque.client_name || 'Cliente não informado'}</h3>
                    <Badge variant={embarque.status === 'needs_attention' ? 'destructive' : 'outline'} className={embarque.status === 'waiting_confirmation' ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : ''}>
                      {embarque.status === 'needs_attention' ? 'Verificação Necessária' :
                        embarque.status === 'waiting_confirmation' ? 'Aguardando Confirmação GMX' :
                          embarque.status === 'new' ? 'Novo' : embarque.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{embarque.origin}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span>{embarque.destination}</span>
                    </div>
                    {embarque.delivery_window_end && (
                      <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(embarque.delivery_window_end).toLocaleDateString()}</span>
                      </div>
                    )}
                    {embarque.cargo_type && (
                      <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                        <Package className="h-3.5 w-3.5" />
                        <span>{embarque.cargo_type}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Area */}
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleOfferAllMatches(embarque.id)}>
                    Buscar Veículos Compatíveis
                  </Button>
                </div>
              </div>

              {/* Matches Section */}
              {embarqueMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {embarqueMatches.slice(0, 3).map((match: any, index: number) => {
                    const isTop1 = index === 0;
                    return (
                      <div key={match.id} className={`border rounded-md p-3 bg-card hover:bg-accent/50 transition-colors flex flex-col gap-2 ${isTop1 ? 'border-primary/50 bg-primary/5' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </span>
                            <span className="font-semibold text-sm">{match.driver?.name || 'Motorista'}</span>
                          </div>
                          <Badge variant={match.compatibility_level === 'high' ? 'default' : 'outline'} className="text-xs">
                            {match.compatibility_score}%
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {match.driver?.truck_plate || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {match.driver?.current_location || 'Loc. desconhecida'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t mt-1 gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs flex-1"
                            onClick={() => handleAssignDriver(embarque.id, match.driver_id.id || match.driver_id, match.id)}
                            disabled={assigningMatch === match.id}
                          >
                            {assigningMatch === match.id ? "..." : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" /> Alocar
                              </>
                            )}
                          </Button>

                          {match.status === 'suggested' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs flex-1"
                              onClick={() => handleOfferMatch(match.id, embarque.id)}
                              disabled={offeringMatch === match.id}
                            >
                              {offeringMatch === match.id ? "..." : "Ofertar"}
                            </Button>
                          )}
                          {match.status === 'offered' && (
                            <Badge variant="secondary" className="h-7 flex items-center justify-center flex-1">Ofertado</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 bg-accent/5 rounded-lg border border-dashed text-sm text-muted-foreground gap-2">
                  <Truck className="h-4 w-4 opacity-50" />
                  <p>Ainda não há veículos compatíveis sugeridos para esta rota.</p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
