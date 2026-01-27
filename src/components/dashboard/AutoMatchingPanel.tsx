import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVehicleMatching } from "@/hooks/useVehicleMatching";
import { Truck, MapPin, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";

interface AutoMatchingPanelProps {
  embarqueId: string;
  onMatchSelected?: (matchId: string) => void;
}

export function AutoMatchingPanel({ embarqueId, onMatchSelected }: AutoMatchingPanelProps) {
  const { matches, isLoading, updateMatchStatus } = useVehicleMatching(embarqueId);
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  const handleOfferMatch = async (matchId: string) => {
    try {
      await updateMatchStatus(matchId, 'offered');
      toast({
        title: "Oferta enviada",
        description: "A oferta foi enviada para o motorista com sucesso.",
      });
      setSelectedMatch(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a oferta.",
        variant: "destructive",
      });
    }
  };

  const getCompatibilityColor = (level: string) => {
    switch (level) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCompatibilityIcon = (level: string) => {
    switch (level) {
      case 'high': return '🟢';
      case 'medium': return '🟡';
      case 'low': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, any> = {
      suggested: { variant: 'secondary', label: 'Sugerido' },
      offered: { variant: 'default', label: 'Ofertado' },
      accepted: { variant: 'default', label: 'Aceito' },
      rejected: { variant: 'destructive', label: 'Rejeitado' },
    };
    const { variant, label } = config[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return <div>Carregando sugestões...</div>;
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-muted-foreground">Nenhuma sugestão disponível</p>
          <p className="text-sm text-muted-foreground">
            Execute o matching automático para ver sugestões
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Veículos Sugeridos ({matches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => setSelectedMatch(match)}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="text-2xl">
                  {getCompatibilityIcon(match.compatibility_level)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {match.compatibility_score}% - {match.driver?.name || 'Motorista'}
                    </p>
                    <Badge variant={getCompatibilityColor(match.compatibility_level)}>
                      {match.compatibility_level.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      {match.driver?.truck_plate || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {match.driver?.current_location || 'Localização não definida'}
                    </span>
                  </div>
                  {match.factors && Object.keys(match.factors).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {Object.entries(match.factors).slice(0, 2).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(match.status)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Match Details Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMatch && getCompatibilityIcon(selectedMatch.compatibility_level)}
              Detalhes do Match - {selectedMatch?.compatibility_score}%
            </DialogTitle>
          </DialogHeader>
          
          {selectedMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold mb-1">Motorista:</p>
                  <p className="text-sm">{selectedMatch.driver?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Veículo:</p>
                  <p className="text-sm">{selectedMatch.driver?.truck_plate}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Localização Atual:</p>
                  <p className="text-sm">{selectedMatch.driver?.current_location || 'Não definida'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Tipo de Veículo:</p>
                  <p className="text-sm">{selectedMatch.driver?.vehicle_type || 'Não definido'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Status de Disponibilidade:</p>
                  <p className="text-sm">{selectedMatch.driver?.availability_status || 'Não definido'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Status do Match:</p>
                  {getStatusBadge(selectedMatch.status)}
                </div>
              </div>

              {selectedMatch.factors && (
                <div>
                  <p className="text-sm font-semibold mb-2">Fatores de Compatibilidade:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedMatch.factors).map(([key, value]) => (
                      <div key={key} className="text-sm p-2 bg-accent rounded">
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMatch.offered_at && (
                <div>
                  <p className="text-sm font-semibold mb-1">Ofertado em:</p>
                  <p className="text-sm">{new Date(selectedMatch.offered_at).toLocaleString('pt-BR')}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMatch(null)}>
              Fechar
            </Button>
            {selectedMatch?.status === 'suggested' && (
              <Button onClick={() => handleOfferMatch(selectedMatch.id)}>
                Enviar Oferta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
