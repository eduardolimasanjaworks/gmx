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
  Navigation,
  Calendar,
  FileText,
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
      // MOCK DATA EXPANDIDO - Para visualização do layout completo
      return [
        {
          id: 'j1',
          embarque_id: 'e1',
          driver_id: 'd1',
          departure_time: new Date(Date.now() - 3600000).toISOString(),
          estimated_arrival: new Date(Date.now() + 7200000).toISOString(),
          current_status: 'in_transit',
          is_on_time: true,
          delay_justification: null,
          driver: { name: 'João Silva', truck_plate: 'ABC-1234', vehicle_type: 'Truck' },
          embarque: {}
        }
      ];
    },
  });

  // DADOS MOCK BASEADOS NO JSON REAL FORNECIDO PELO USUÁRIO
  const embarquesWithAllFields = [
    {
      id: '1',
      pedido: 'ME',
      data_pedido: '2/10/2026',
      data_carregado: '2/10/2026',
      origin: 'F. ESTANCIA',
      destination: 'BALL JACAREI',
      uf: 'SP',
      client_name: 'Ball Corporation',
      nome_tp: 'CARGO X',
      cargo_type: 'MATERIAL EMBALAGEM',
      palets: 'ME',
      status: 'TRANSITO DESCARGA',
      data_chega_fornecedor: '',
      data_chega_ambev: '2/15/26 0:16',
      placa: 'AKN1J94',
      motorista_nome: 'Huxley Silva de Souza',
      nf: '317828',
      cte: '756751',
      contrato: '89198',
      proprietario: '',
      fechado: 'R$ 8.000',
      carga_extra: 'ME',
      instrucao_viagem: 'OK',
      lead_time: '100:19:12',
      data_carregamento_real: '2/10/26 19:57',
      data_descarga_real: '',
      data_prevista_lead_time: '2/15/26 0:16',
      status_final: '',
      ocorrencia: 'SIM 139',
    },
    {
      id: '2',
      pedido: '5800493466',
      data_pedido: '2/20/2026',
      data_carregado: '',
      origin: 'BALL RECIFE',
      destination: 'F. TERESINA',
      uf: 'PE',
      client_name: 'Fazenda Teresina',
      nome_tp: 'CARGOX',
      cargo_type: 'LATAS',
      palets: '25',
      status: 'AGUARDANDO CTE',
      data_chega_fornecedor: '',
      data_chega_ambev: '',
      placa: '',
      motorista_nome: '',
      nf: '',
      cte: '',
      contrato: '',
      proprietario: '',
      fechado: 'R$ 6.500',
      carga_extra: '',
      instrucao_viagem: '',
      lead_time: '63:36:00',
      data_carregamento_real: '',
      data_descarga_real: '',
      data_prevista_lead_time: '1/1/00 15:36',
      status_final: '',
      ocorrencia: '',
    },
    {
      id: '3',
      pedido: '5800495037',
      data_pedido: '2/20/2026',
      data_carregado: '',
      origin: 'BALL TRÊS RIOS',
      destination: 'F. LAGES',
      uf: 'SC',
      client_name: 'Fazenda Lages',
      nome_tp: 'CARGOX',
      cargo_type: 'LATAS',
      palets: '25',
      status: 'AGUARDANDO CTE',
      data_chega_fornecedor: '',
      data_chega_ambev: '',
      placa: '',
      motorista_nome: '',
      nf: '',
      cte: '',
      contrato: '',
      proprietario: '',
      fechado: 'R$ 8.000',
      carga_extra: '',
      instrucao_viagem: '',
      lead_time: '70:48:00',
      data_carregamento_real: '',
      data_descarga_real: '',
      data_prevista_lead_time: '1/1/00 22:48',
      status_final: '',
      ocorrencia: '',
    },
  ];

  const filteredEmbarques = embarquesWithAllFields.filter(e =>
    e.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.pedido?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Follow - Acompanhamento de Cargas
          </CardTitle>
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
              placeholder="Buscar por pedido, origem, destino ou cliente..."
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

        {/* Table simplificada com 6 colunas principais */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="min-w-[100px]">Pedido</TableHead>
                <TableHead className="min-w-[150px]">Origem</TableHead>
                <TableHead className="min-w-[150px]">Destino</TableHead>
                <TableHead className="min-w-[60px]">UF</TableHead>
                <TableHead className="min-w-[150px]">Cliente</TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
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
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(embarque.id)}
                      >
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>

                        {/* Pedido */}
                        <TableCell className="font-medium">
                          {embarque.pedido}
                        </TableCell>

                        {/* Origem */}
                        <TableCell>
                          <span className="text-sm">{embarque.origin || '-'}</span>
                        </TableCell>

                        {/* Destino */}
                        <TableCell>
                          <span className="text-sm">{embarque.destination || '-'}</span>
                        </TableCell>

                        {/* UF */}
                        <TableCell>
                          <span className="text-sm font-medium">{embarque.uf || '-'}</span>
                        </TableCell>

                        {/* Cliente */}
                        <TableCell>
                          <span className="text-sm">{embarque.client_name || '-'}</span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {getStatusBadge(journey?.current_status || embarque.status)}
                        </TableCell>
                      </TableRow>

                      {/* Painel de Detalhes Completo - Sempre disponível */}
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-6">
                            <div className="space-y-6">

                              {/* Título do Painel */}
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-lg">Detalhes Completos do Embarque</h3>
                              </div>

                              {/* Grid de Informações - 3 colunas */}
                              <div className="grid grid-cols-3 gap-4">

                                {/* Datas */}
                                <div className="p-4 border rounded-lg bg-background">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Datas</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Pedido:</span>
                                      <p className="font-medium">{embarque.data_pedido}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Carregado:</span>
                                      <p className="font-medium">{embarque.data_carregado}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Chega Fornecedor:</span>
                                      <p className="font-medium text-xs">{embarque.data_chega_fornecedor}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Chega Ambev:</span>
                                      <p className="font-medium text-xs">{embarque.data_chega_ambev}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Transportadora e Produto */}
                                <div className="p-4 border rounded-lg bg-background">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Carga</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Nome da TP:</span>
                                      <p className="font-medium">{embarque.nome_tp}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Produto:</span>
                                      <p className="font-medium">{embarque.cargo_type || 'Grãos'}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Palets:</span>
                                      <p className="font-medium">{embarque.palets || '-'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Veículo e Motorista */}
                                <div className="p-4 border rounded-lg bg-background">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Truck className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Veículo</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Placa:</span>
                                      <p className="font-medium font-mono">{embarque.placa}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Motorista:</span>
                                      <p className="font-medium">{embarque.motorista_nome}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Proprietário:</span>
                                      <p className="font-medium">{embarque.proprietario}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Documentação */}
                                <div className="p-4 border rounded-lg bg-background">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Documentação</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">NF:</span>
                                      <p className="font-medium font-mono">{embarque.nf}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">CTE:</span>
                                      <p className="font-medium font-mono">{embarque.cte}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Contrato:</span>
                                      <p className="font-medium">{embarque.contrato}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Status e Flags */}
                                <div className="p-4 border rounded-lg bg-background">
                                  <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Status</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Fechado:</span>
                                      <p className="font-medium text-green-600">{embarque.fechado || '-'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Carga Extra:</span>
                                      <Badge variant={embarque.carga_extra ? 'secondary' : 'outline'}>
                                        {embarque.carga_extra || 'Não'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Status Final:</span>
                                      <Badge variant={
                                        embarque.status_final === 'Concluído' ? 'default' :
                                          embarque.status_final === 'Em Andamento' ? 'secondary' : 'outline'
                                      }>
                                        {embarque.status_final}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Lead Times */}
                                <div className="p-4 border rounded-lg bg-background">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Lead Times</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Lead Time:</span>
                                      <p className="font-medium">{embarque.lead_time}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Carregamento Real:</span>
                                      <p className="font-medium text-xs">{embarque.data_carregamento_real}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Descarga Real:</span>
                                      <p className="font-medium text-xs">{embarque.data_descarga_real}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Prevista Lead Time:</span>
                                      <p className="font-medium text-xs">{embarque.data_prevista_lead_time}</p>
                                    </div>
                                  </div>
                                </div>

                              </div>

                              {/* Instruções e Ocorrências - Full Width */}
                              <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 border rounded-lg bg-background">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">Instruções de Viagem</h4>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{embarque.instrucao_viagem}</p>
                                </div>

                                {embarque.ocorrencia && (
                                  <div className="p-4 border rounded-lg border-orange-200 bg-orange-50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertCircle className="h-4 w-4 text-orange-600" />
                                      <h4 className="font-medium text-orange-900">Ocorrência</h4>
                                    </div>
                                    <p className="text-sm text-orange-700">{embarque.ocorrencia}</p>
                                  </div>
                                )}
                              </div>

                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
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