import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/useFollow";
import { useState } from "react";
import {
  Search,
  Package,
  Truck,
  MapPin,
  Download,
  ChevronDown,
  ChevronUp,
  Upload,
  Calendar,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CsvImportDialog } from "./CsvImportDialog";
import { useNavigate } from "react-router-dom";

export function ShipmentFollow() {
  const { followItems, isLoading, updateFollow } = useFollow();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const navigate = useNavigate();

  const filteredItems = followItems.filter((item: any) =>
    item.origem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.produto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleUpdateField = async (id: string, field: 'data_pedido' | 'data_carregado' | 'paletes', value: string) => {
    try {
      await updateFollow(id, { [field]: value || null });
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'novo': { variant: 'secondary', label: 'Novo' },
      'em_transito': { variant: 'default', label: 'Em Trânsito' },
      'entregue': { variant: 'outline', label: 'Entregue' },
      'problema': { variant: 'destructive', label: 'Com Problema' },
    };
    const config = variants[status] || { variant: 'secondary', label: status || 'Novo' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
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
            <Badge variant="outline">Total: {filteredItems.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Actions */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por pedido, origem, destino, TP, produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsCsvImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
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
                <TableHead className="w-10" />
                <TableHead className="min-w-[100px]">Pedido</TableHead>
                <TableHead className="min-w-[150px]">Origem</TableHead>
                <TableHead className="min-w-[150px]">Destino</TableHead>
                <TableHead className="min-w-[80px]">Paletes</TableHead>
                <TableHead className="min-w-[150px]">Cliente</TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Nenhum registro encontrado</p>
                    <p className="text-sm mt-1">Importe um CSV para começar</p>
                  </TableCell>
                </TableRow>
              ) : filteredItems.map((item: any) => {
                const rowId = String(item.id);
                const isExpanded = expandedRows.has(rowId);
                return (
                  <Collapsible key={rowId} asChild open={isExpanded}>
                    <>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(rowId)}
                      >
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">{item.pedido || '-'}</TableCell>
                        <TableCell className="text-sm">{item.origem || '-'}</TableCell>
                        <TableCell className="text-sm">{item.destino || '-'}</TableCell>
                        <TableCell className="text-sm font-medium">{item.paletes || '-'}</TableCell>
                        <TableCell className="text-sm">{item.cliente || '-'}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                      </TableRow>

                      {/* Expanded detail panel */}
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-6">
                            <div className="grid grid-cols-4 gap-4">
                              {/* Carga */}
                              <div className="p-4 border rounded-lg bg-background">
                                <div className="flex items-center gap-2 mb-3">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-medium">Carga</h4>
                                </div>
                                <div className="space-y-3 text-sm">
                                  <div><span className="text-muted-foreground">Pedido:</span><p className="font-medium">{item.pedido || '-'}</p></div>
                                  <div><span className="text-muted-foreground">Produto:</span><p className="font-medium">{item.produto || '-'}</p></div>
                                  <div>
                                    <label className="text-muted-foreground block mb-1">Paletes:</label>
                                    <Input
                                      type="text"
                                      defaultValue={item.paletes || ''}
                                      placeholder="Ex: 12"
                                      onBlur={(e) => {
                                        const newVal = e.target.value;
                                        if (newVal !== (item.paletes || '')) {
                                          handleUpdateField(rowId, 'paletes' as any, newVal);
                                        }
                                      }}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Rota */}
                              <div className="p-4 border rounded-lg bg-background">
                                <div className="flex items-center gap-2 mb-3">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-medium">Rota</h4>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div><span className="text-muted-foreground">Origem:</span><p className="font-medium">{item.origem || '-'}</p></div>
                                  <div><span className="text-muted-foreground">Destino:</span><p className="font-medium">{item.destino || '-'}</p></div>
                                  <div><span className="text-muted-foreground">UF:</span><p className="font-medium">{item.uf || '-'}</p></div>
                                </div>
                              </div>

                              {/* Logística */}
                              <div className="p-4 border rounded-lg bg-background">
                                <div className="flex items-center gap-2 mb-3">
                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-medium">Logística</h4>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div><span className="text-muted-foreground">Cliente:</span><p className="font-medium">{item.cliente || '-'}</p></div>
                                  <div><span className="text-muted-foreground">Transportadora:</span><p className="font-medium">{item.tp || '-'}</p></div>
                                  <div><span className="text-muted-foreground">Status:</span><p className="font-medium">{item.status || '-'}</p></div>
                                </div>
                              </div>

                              {/* Datas (Editáveis) */}
                              <div className="p-4 border rounded-lg bg-background">
                                <div className="flex items-center gap-2 mb-3">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-medium">Datas</h4>
                                </div>
                                <div className="space-y-3 text-sm">
                                  <div>
                                    <label className="text-muted-foreground block mb-1">Data Pedido:</label>
                                    <Input
                                      type="date"
                                      defaultValue={item.data_pedido ? item.data_pedido.split('T')[0] : ''}
                                      onBlur={(e) => {
                                        const newVal = e.target.value;
                                        if (newVal !== (item.data_pedido ? item.data_pedido.split('T')[0] : '')) {
                                          handleUpdateField(rowId, 'data_pedido', newVal);
                                        }
                                      }}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-muted-foreground block mb-1">Data Carregado:</label>
                                    <Input
                                      type="date"
                                      defaultValue={item.data_carregado ? item.data_carregado.split('T')[0] : ''}
                                      onBlur={(e) => {
                                        const newVal = e.target.value;
                                        if (newVal !== (item.data_carregado ? item.data_carregado.split('T')[0] : '')) {
                                          handleUpdateField(rowId, 'data_carregado', newVal);
                                        }
                                      }}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Actions Panel */}
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                              <Button
                                onClick={() => {
                                  const lat = item.origem_lat || "";
                                  const lng = item.origem_lng || "";
                                  const data = item.data_coleta || ""; // If there is a date field in follow, pass it
                                  navigate(`/?tab=tracking&load_origin=${encodeURIComponent(item.origem || '')}&load_lat=${lat}&load_lng=${lng}&load_date=${data}`);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <MapPin className="mr-2 h-4 w-4" />
                                Encontrar Motorista no Mapa
                              </Button>
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

        <CsvImportDialog
          open={isCsvImportOpen}
          onOpenChange={setIsCsvImportOpen}
        />
      </CardContent>
    </Card>
  );
}