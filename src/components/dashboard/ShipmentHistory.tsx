import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ShipmentDetailsDialog } from "@/components/shipment/ShipmentDetailsDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToCSV, ExportColumn } from "@/lib/csvExporter";
import { useToast } from "@/hooks/use-toast";


export const ShipmentHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completedShipments, setCompletedShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch completed shipments from database
  // Fetch completed shipments from mock data
  useEffect(() => {
    const fetchCompletedShipments = async () => {
      try {
        // MOCK DATA
        const mockData = [
          {
            id: "1",
            status: "delivered",
            delivery_date: new Date().toISOString(),
            created_at: new Date(Date.now() - 86400000).toISOString(),
            origin: "São Paulo, SP",
            destination: "Curitiba, PR",
            driver_id: "driver1",
            total_value: 5000,
            driver: { id: "driver1", name: "João da Silva (MOCK)", cpf: "000.000.000-00", phone: "11999999999" }
          },
          {
            id: "2",
            status: "delivered",
            delivery_date: new Date(Date.now() - 172800000).toISOString(),
            created_at: new Date(Date.now() - 259200000).toISOString(),
            origin: "Belo Horizonte, MG",
            destination: "Rio de Janeiro, RJ",
            driver_id: "driver2",
            total_value: 7500,
            driver: { id: "driver2", name: "Maria Oliveira (MOCK)", cpf: "111.111.111-11", phone: "21988888888" }
          }
        ];

        const formatted = mockData.map(embarque => ({
          ...embarque,
          driver: embarque.driver,
          formattedDate: embarque.delivery_date
            ? format(new Date(embarque.delivery_date), "dd/MM/yyyy", { locale: ptBR })
            : format(new Date(embarque.created_at), "dd/MM/yyyy", { locale: ptBR }),
          formattedValue: embarque.total_value || 0,
        }));

        setCompletedShipments(formatted);
      } catch (error) {
        console.error('Error fetching completed shipments:', error);
        toast({
          title: "Erro ao carregar histórico",
          description: "Não foi possível carregar os embarques concluídos.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletedShipments();
    // Realtime removed
  }, [toast]);

  // Filter shipments
  const filteredShipments = useMemo(() => {
    if (!searchTerm) return completedShipments;

    const searchLower = searchTerm.toLowerCase();
    return completedShipments.filter(shipment =>
      shipment.id?.toLowerCase().includes(searchLower) ||
      shipment.origin?.toLowerCase().includes(searchLower) ||
      shipment.destination?.toLowerCase().includes(searchLower) ||
      shipment.driver?.name?.toLowerCase().includes(searchLower)
    );
  }, [completedShipments, searchTerm]);

  const handleExport = () => {
    const columns: ExportColumn[] = [
      { key: "id", label: "ID" },
      { key: "formattedDate", label: "Data" },
      { key: "origin", label: "Origem" },
      { key: "destination", label: "Destino" },
      { key: "driver.name", label: "Motorista" },
      { key: "formattedValue", label: "Valor", format: (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      { key: "status", label: "Status" },
    ];

    exportToCSV(filteredShipments, columns, "historico-embarques");

    toast({
      title: "Exportação concluída",
      description: "Histórico exportado com sucesso!",
    });
  };

  const handleViewDetails = (shipment: any) => {
    setSelectedShipment(shipment);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ShipmentDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shipment={selectedShipment}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Histórico de Embarques
          </h2>
          <p className="text-muted-foreground">
            Consulte todos os embarques concluídos ({completedShipments.length})
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={completedShipments.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, motorista, origem ou destino..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {filteredShipments.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Nenhum embarque encontrado com os filtros aplicados."
                  : "Nenhum embarque concluído ainda."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Número
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Origem
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Destino
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Motorista
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">
                        {shipment.id.split('-')[0]}
                      </td>
                      <td className="px-4 py-3 text-sm">{shipment.formattedDate}</td>
                      <td className="px-4 py-3 text-sm">{shipment.origin}</td>
                      <td className="px-4 py-3 text-sm">{shipment.destination}</td>
                      <td className="px-4 py-3 text-sm">
                        {shipment.driver?.name || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-success">
                        R$ {shipment.formattedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge className="bg-success text-success-foreground">
                          Concluído
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(shipment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};