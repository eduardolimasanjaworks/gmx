import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Package, DollarSign, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: string;
  product?: string;
}

export function RouteAnalyticsModal({ open, onOpenChange, route, product }: RouteAnalyticsModalProps) {
  // Fetch route analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['route_analytics', route, product],
    queryFn: async () => {
      let query = supabase
        .from('route_analytics')
        .select('*');

      if (route.includes('→')) {
        const [origin, destination] = route.split('→').map(s => s.trim());
        query = query.eq('origin', origin).eq('destination', destination);
      }

      if (product) {
        query = query.eq('product_type', product);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!route,
  });

  // Fetch available drivers for this route
  const { data: availableDrivers, isLoading: driversLoading } = useQuery({
    queryKey: ['available_drivers_route', route],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('availability_status', 'available')
        .or(`current_location.ilike.%${route.split('→')[0]?.trim()}%,current_location.is.null`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!route,
  });

  // Fetch pending shipments for this route
  const { data: pendingShipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ['pending_shipments_route', route],
    queryFn: async () => {
      let query = supabase
        .from('embarques')
        .select('*')
        .in('status', ['pending', 'new', 'awaiting_response']);

      if (route.includes('→')) {
        const [origin, destination] = route.split('→').map(s => s.trim());
        query = query.eq('origin', origin).eq('destination', destination);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!route,
  });

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDuration = (interval?: string | null) => {
    if (!interval) return 'N/A';
    const intervalStr = String(interval);
    const matches = intervalStr.match(/(\d+):(\d+):(\d+)/);
    if (!matches) return intervalStr;
    const hours = parseInt(matches[1]);
    return `${hours}h`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Análise Detalhada: {route}</DialogTitle>
          {product && <Badge variant="outline" className="w-fit mt-2">{product}</Badge>}
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="cadastro_motorista">Motoristas</TabsTrigger>
            <TabsTrigger value="shipments">Embarques</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {analyticsLoading ? (
              <Skeleton className="h-[200px]" />
            ) : analytics ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Viagens
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.successful_trips || 0}</div>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Receita Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(Number(analytics.total_revenue))}</div>
                    <p className="text-xs text-muted-foreground">Acumulado</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Lead Time Médio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatDuration(analytics.avg_lead_time as string | null)}</div>
                    <p className="text-xs text-muted-foreground">Tempo médio</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Reaproveitamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.fleet_reuse_percentage?.toFixed(1) || 0}%</div>
                    <p className="text-xs text-muted-foreground">Da frota</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum dado analítico disponível para esta rota
              </Card>
            )}

            {analytics?.profitability_score && (
              <Card>
                <CardHeader>
                  <CardTitle>Score de Rentabilidade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-primary">
                      {analytics.profitability_score.toFixed(1)}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.min(Number(analytics.profitability_score || 0) * 10, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Baseado em receita, lead time e taxa de sucesso
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cadastro_motorista" className="space-y-4">
            <h4 className="font-semibold mb-2">Motoristas Ativos na Rota</h4><Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Motoristas Disponíveis ({availableDrivers?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {driversLoading ? (
                  <Skeleton className="h-[200px]" />
                ) : availableDrivers && availableDrivers.length > 0 ? (
                  <div className="space-y-3">
                    {availableDrivers.map((driver) => (
                      <div key={driver.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-semibold">{driver.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {driver.truck_plate} - {driver.vehicle_type || 'N/A'}
                          </p>
                          {driver.current_location && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {driver.current_location}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                          Disponível
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum motorista disponível no momento
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Embarques Pendentes ({pendingShipments?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shipmentsLoading ? (
                  <Skeleton className="h-[200px]" />
                ) : pendingShipments && pendingShipments.length > 0 ? (
                  <div className="space-y-3">
                    {pendingShipments.map((shipment) => (
                      <div key={shipment.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">
                              {shipment.origin} → {shipment.destination}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {shipment.client_name || 'Cliente não informado'}
                            </p>
                          </div>
                          <Badge variant={shipment.status === 'new' ? 'default' : 'secondary'}>
                            {shipment.status === 'new' ? 'Novo' :
                              shipment.status === 'pending' ? 'Pendente' :
                                'Aguardando'}
                          </Badge>
                        </div>
                        {shipment.cargo_type && (
                          <p className="text-sm">
                            <span className="font-medium">Carga:</span> {shipment.cargo_type}
                          </p>
                        )}
                        {shipment.total_value && (
                          <p className="text-sm text-primary font-semibold mt-1">
                            {formatCurrency(Number(shipment.total_value))}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum embarque pendente para esta rota
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {analyticsLoading ? (
              <Skeleton className="h-[300px]" />
            ) : analytics ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Valor Médio por Viagem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(Number(analytics.avg_value))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Baseado em {analytics.successful_trips} viagens concluídas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Percentual de Reaproveitamento de Frota</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-3xl font-bold">
                        {analytics.fleet_reuse_percentage?.toFixed(1) || 0}%
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Reaproveitamento</span>
                          <span className="font-medium">{analytics.fleet_reuse_percentage?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                            style={{ width: `${analytics.fleet_reuse_percentage || 0}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Indica quantos veículos são reutilizados nesta rota após conclusão de viagens
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhuma métrica disponível
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
