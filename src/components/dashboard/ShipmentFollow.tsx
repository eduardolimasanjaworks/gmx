import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmbarques } from "@/hooks/useEmbarques";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Package,
  Truck,
  MapPin,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Navigation
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function ShipmentFollow() {
  const { embarques, isLoading } = useEmbarques();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: journeys = [] } = useQuery({
    queryKey: ['vehicle-journeys-all'],
    queryFn: async () => {
      // MOCK DATA
      return [
        {
          id: 'j1',
          embarque_id: 'e1', // Must match an ID from useEmbarques mock if possible, or be ignored
          driver_id: 'd1',
          departure_time: new Date(Date.now() - 3600000).toISOString(),
          estimated_arrival: new Date(Date.now() + 7200000).toISOString(),
          current_status: 'in_transit',
          is_on_time: true,
          delay_justification: null, // Fixed: Added missing property
          driver: { name: 'João (MOCK)', truck_plate: 'ABC-1234', vehicle_type: 'Truck' },
          embarque: {}
        }
      ];
    },
  });

  const filteredEmbarques = embarques.filter(e =>
    e.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getJourneyForEmbarque = (embarqueId: string) => {
    return journeys.find(j => j.embarque_id === embarqueId);
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'new': { variant: 'secondary', label: 'Novo' },
      'needs_attention': { variant: 'destructive', label: 'Sem Veículo' },
      'in_transit': { variant: 'default', label: 'Em Trânsito' },
      'loading': { variant: 'default', label: 'Carregando' },
      'unloading': { variant: 'default', label: 'Descarregando' },
      'completed': { variant: 'outline', label: 'Concluído' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateProgress = (embarque: any) => {
    if (embarque.status === 'completed') return 100;
    if (embarque.status === 'unloading') return 80;
    if (embarque.status === 'in_transit') return 50;
    if (embarque.status === 'loading') return 25;
    if (embarque.status === 'new') return 10;
    return 0;
  };

  const calculateETA = (embarque: any, journey: any) => {
    if (journey?.estimated_arrival) {
      const eta = new Date(journey.estimated_arrival);
      const now = new Date();
      const diff = eta.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));

      if (hours < 0) return { text: 'Atrasado', color: 'text-destructive' };
      if (hours < 2) return { text: `${hours}h`, color: 'text-yellow-600' };
      return { text: `${hours}h`, color: 'text-green-600' };
    }

    if (!embarque.delivery_date) return { text: 'Não definido', color: 'text-muted-foreground' };

    const deliveryDate = new Date(embarque.delivery_date);
    const now = new Date();
    const diff = deliveryDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 0) return { text: 'Atrasado', color: 'text-destructive' };
    if (hours < 24) return { text: `${hours}h`, color: 'text-yellow-600' };
    const days = Math.floor(hours / 24);
    return { text: `${days}d`, color: 'text-green-600' };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      loading: 'bg-blue-500',
      in_transit: 'bg-green-500',
      unloading: 'bg-yellow-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      loading: 'Carregando',
      in_transit: 'Em Trânsito',
      unloading: 'Descarregando',
    };
    return labels[status] || status;
  };

  const calculateNextAvailability = (estimatedArrival: string) => {
    const eta = new Date(estimatedArrival);
    eta.setHours(eta.getHours() + 3);
    return eta.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card className="opacity-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-400">
            <Package className="h-5 w-5" />
            Follow - Acompanhamento de Cargas
          </CardTitle>
          <div className="text-gray-400 text-4xl">🚧</div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Total: {filteredEmbarques.length}</Badge>
            <Badge variant="default">
              Em trânsito: {filteredEmbarques.filter(e => e.status === 'in_transit').length}
            </Badge>
            <Badge variant="destructive">
              Sem veículo: {filteredEmbarques.filter(e => e.status === 'needs_attention').length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por origem, destino ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Transit Time</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmbarques.map((embarque) => {
                const journey = getJourneyForEmbarque(embarque.id);
                const eta = calculateETA(embarque, journey);
                const isExpanded = expandedRows.has(embarque.id);
                const hasJourney = !!journey;

                return (
                  <Collapsible key={embarque.id} asChild open={isExpanded}>
                    <>
                      <TableRow
                        className={hasJourney ? "cursor-pointer hover:bg-muted/50" : ""}
                        onClick={() => hasJourney && toggleRow(embarque.id)}
                      >
                        <TableCell>
                          {hasJourney && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(journey?.current_status || embarque.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {embarque.origin} → {embarque.destination}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{embarque.cargo_type || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {journey ? (
                            <div className="flex items-center gap-1">
                              <Truck className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{journey.driver?.name || 'Alocado'}</span>
                            </div>
                          ) : embarque.driver_id ? (
                            <div className="flex items-center gap-1">
                              <Truck className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">Alocado</span>
                            </div>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              SEM VEÍCULO
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {embarque.pickup_date && embarque.delivery_date
                                ? `${Math.floor((new Date(embarque.delivery_date).getTime() - new Date(embarque.pickup_date).getTime()) / (1000 * 60 * 60))}h`
                                : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${eta.color}`}>
                            {eta.text}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="w-20">
                            <Progress value={calculateProgress(embarque)} className="h-2" />
                          </div>
                        </TableCell>
                      </TableRow>

                      {hasJourney && (
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={8} className="p-0">
                              <div className="p-4 space-y-4">
                                {/* Timeline Header */}
                                <div className="flex items-center gap-2 mb-4">
                                  <Navigation className="h-5 w-5 text-primary" />
                                  <span className="font-semibold">Timeline da Viagem</span>
                                  {!journey.is_on_time && (
                                    <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Fora do LeadTime
                                    </Badge>
                                  )}
                                </div>

                                {/* Driver Info */}
                                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Truck className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{journey.driver?.name || 'Motorista'}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {journey.driver?.truck_plate || 'Sem placa'} • {journey.driver?.vehicle_type || 'Tipo não informado'}
                                    </p>
                                  </div>
                                </div>

                                {/* Timeline */}
                                <div className="relative pl-8 space-y-3">
                                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

                                  {/* Departure */}
                                  <div className="relative">
                                    <div className="absolute -left-[26px] h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
                                    <div>
                                      <p className="text-sm font-medium">Partida</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(journey.departure_time).toLocaleString('pt-BR')}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Current Status */}
                                  <div className="relative">
                                    <div className={`absolute -left-[26px] h-4 w-4 rounded-full border-2 border-background ${getStatusColor(journey.current_status)}`} />
                                    <div>
                                      <p className="text-sm font-medium">{getStatusLabel(journey.current_status)}</p>
                                      <p className="text-xs text-muted-foreground">Status atual</p>
                                    </div>
                                  </div>

                                  {/* ETA */}
                                  <div className="relative">
                                    <div className="absolute -left-[26px] h-4 w-4 rounded-full bg-blue-500 border-2 border-background" />
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <p className="text-sm font-medium">ETA - Chegada Prevista</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(journey.estimated_arrival).toLocaleString('pt-BR')}
                                        </p>
                                      </div>
                                      <Badge variant="outline" className={eta.color}>
                                        <Clock className="h-3 w-3 mr-1" />
                                        {eta.text}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Next Availability */}
                                  <div className="relative">
                                    <div className="absolute -left-[26px] h-4 w-4 rounded-full bg-purple-500 border-2 border-background" />
                                    <div>
                                      <p className="text-sm font-medium flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-purple-500" />
                                        Disponível para nova carga
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Previsão: {calculateNextAvailability(journey.estimated_arrival)}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Justification */}
                                {journey.delay_justification && (
                                  <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium">Justificativa do Atraso:</p>
                                      <p className="text-sm text-muted-foreground">{journey.delay_justification}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      )}
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredEmbarques.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-semibold">Nenhuma carga encontrada</p>
            <p className="text-sm">Ajuste os filtros ou crie uma nova carga</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}