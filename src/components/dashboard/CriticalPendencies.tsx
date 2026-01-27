import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Package, Truck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { directus, publicDirectus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { useOperationalAlerts } from "@/hooks/useOperationalAlerts";
import { updateEmbarqueStatus } from "@/lib/embarques";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CriticalPendencies() {
  const { criticalAlerts, highAlerts, resolveAlert } = useOperationalAlerts();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: immediateActions = [], isLoading: loadingActions } = useQuery({
    queryKey: ['immediate-actions'],
    queryFn: async () => {
      try {
        const response = await directus.request(readItems('embarques', {
          filter: {
            status: {
              _in: ['needs_attention', 'waiting_confirmation']
            }
          },
          fields: ['id', 'status', 'origin', 'destination', 'cargo_type', 'date_created', 'client_name'],
          sort: ['-date_created'],
          limit: 10
        }));
        return response;
      } catch (error) {
        console.error("Error fetching immediate actions:", error);
        return [];
      }
    },
    refetchInterval: 15000 // Faster refresh for actions
  });

  const handleConfirmShipment = async (id: string) => {
    setProcessing(true);
    try {
      await updateEmbarqueStatus(id, 'new'); // Confirm -> Moves to New/Active
      toast({ title: "Embarque Confirmado", description: "O embarque foi ativado com sucesso." });
      setSelectedAlert(null);
      queryClient.invalidateQueries({ queryKey: ['immediate-actions'] });
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao confirmar embarque.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualRelease = async (id: string) => {
    setProcessing(true);
    try {
      await updateEmbarqueStatus(id, 'in_transit'); // Manual release -> Force in transit or similar safe state
      toast({ title: "Liberado Manualmente", description: "A pendência foi resolvida manualmente." });
      setSelectedAlert(null);
      queryClient.invalidateQueries({ queryKey: ['immediate-actions'] });
    } catch (e) {
      toast({ title: "Erro", description: "Falha na liberação manual.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loadingActions) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando ações imediatas...</div>;
  }

  if (immediateActions.length === 0) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Ações Imediatas
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
          <p className="font-semibold text-green-600">Tudo em dia! Nenhuma ação imediata necessária.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Ações Imediatas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {immediateActions.map((action: any) => (
            <div
              key={action.id}
              className="flex items-start justify-between p-3 bg-background rounded-lg border border-destructive/20 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-destructive">
                    {action.client_name || 'Cliente Desconhecido'}
                  </span>
                  <Badge variant="destructive" className="text-[10px]">
                    {action.status === 'needs_attention' ? 'Verificação Necessária' : 'Aguardando Confirmação'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>{action.origin}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{action.destination}</span>
                </div>
                {action.cargo_type && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" />
                    <span>{action.cargo_type}</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setSelectedAlert(action)}
              >
                Resolver
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAlert?.status === 'waiting_confirmation' ? 'Confirmar Embarque' :
                selectedAlert?.status === 'needs_attention' ? 'Resolver Pendência' : 'Detalhes'}
            </DialogTitle>
            <DialogDescription>
              {selectedAlert?.status === 'waiting_confirmation'
                ? `Deseja confirmar o embarque de ${selectedAlert?.client_name}? Isso moverá o status para 'Novo' e notificará o motorista.`
                : `Este embarque requer atenção manual. Você pode forçar a liberação ou contatar o suporte.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {selectedAlert && (
              <div className="text-sm bg-muted p-3 rounded-md">
                <p><strong>Cliente:</strong> {selectedAlert.client_name}</p>
                <p><strong>Origem:</strong> {selectedAlert.origin}</p>
                <p><strong>Destino:</strong> {selectedAlert.destination}</p>
                <p><strong>Carga:</strong> {selectedAlert.cargo_type}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {selectedAlert?.status === 'waiting_confirmation' && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleConfirmShipment(selectedAlert.id)}
                  disabled={processing}
                >
                  {processing ? "Processando..." : "✅ Confirmar e Iniciar"}
                </Button>
              )}

              {selectedAlert?.status === 'needs_attention' && (
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={() => handleManualRelease(selectedAlert.id)}
                  disabled={processing}
                >
                  {processing ? "Processando..." : "⚠️ Liberar Manualmente"}
                </Button>
              )}

              <Button variant="outline" className="w-full" onClick={() => setSelectedAlert(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper component for empty state icon
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
