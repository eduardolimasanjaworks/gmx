import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, List, Grid, Download, Settings as SettingsIcon, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
// import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDriverFields } from "@/hooks/useDriverFields";
import { DynamicFieldRenderer } from "@/components/driver/DynamicFieldRenderer";
import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog";
import { FieldConfigManager } from "./FieldConfigManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { directus } from "@/lib/directus";
import { readItems, createItem } from "@directus/sdk";

export const DynamicDriverRegistry = () => {
  const { toast } = useToast();
  const { cardFields, tableFields, isLoading: fieldsLoading } = useDriverFields();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [startInEditMode, setStartInEditMode] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchDrivers();
    // Realtime removed
  }, []);

  /* Custom Fields Definition for Display */
  const displayFields = [
    { id: 'name_full', field_name: 'nome_completo', display_name: 'Nome Completo', field_type: 'text' },
    { id: 'phone', field_name: 'telefone', display_name: 'Telefone', field_type: 'text' },
    { id: 'status', field_name: 'status_logistica', display_name: 'Status', field_type: 'status' },
  ];

  /* Fetch Drivers from Directus manually joining Availability */
  const fetchDrivers = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch Drivers
      const driversData = await directus.request(readItems('cadastro_motorista', {
        fields: ['id', 'nome', 'sobrenome', 'telefone'], // Remove 'status' and 'disponivel' alias
        sort: ['-date_created']
      }));

      // 2. Fetch Latest Availability for these drivers
      const driverIds = driversData.map((d: any) => d.id);
      let availabilityMap: Record<number, any> = {};

      if (driverIds.length > 0) {
        const availabilityData = await directus.request(readItems('disponivel', {
          filter: {
            motorista_id: { _in: driverIds }
          },
          sort: ['-date_created'], // Sort by newest
          limit: -1 // Fetch all relevant history for these drivers to find latest per driver
        }));

        // Populate map with the first (latest) record for each driver
        availabilityData.forEach((record: any) => {
          const mId = record.motorista_id?.id || record.motorista_id; // Handle expanded or ID
          if (mId && !availabilityMap[mId]) {
            availabilityMap[mId] = record;
          }
        });
      }

      // 3. Merge
      const formatted = driversData.map((item: any) => {
        const latestRecord = availabilityMap[item.id];
        const displayStatus = (latestRecord && latestRecord.status === 'disponivel') ? 'Disponível' : 'Indisponível';

        return {
          ...item,
          nome_completo: `${item.nome || ''} ${item.sobrenome || ''}`.trim(),
          current_availability: latestRecord,
          status_logistica: displayStatus
        };
      });

      setDrivers(formatted);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast({
        title: "Erro ao carregar motoristas",
        description: "Não foi possível carregar a lista do Directus.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDriver = (driver: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDriver(driver);
    setStartInEditMode(true);
    setIsProfileOpen(true);
    setStartInEditMode(true);
    setIsProfileOpen(true);
  };

  const handleToggleStatus = async (driver: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentRecord = driver.current_availability;
    const currentStatus = currentRecord?.status === 'disponivel' ? 'disponivel' : 'indisponivel';
    const newStatus = currentStatus === 'disponivel' ? 'indisponivel' : 'disponivel';

    try {
      // Always create a new record for history tracking
      const payload: any = {
        motorista_id: driver.id,
        status: newStatus,
        data_previsao_disponibilidade: new Date().toISOString(),
      };

      // Copy relevant fields from previous record if it exists to maintain context
      if (currentRecord) {
        if (currentRecord.local_disponibilidade) payload.local_disponibilidade = currentRecord.local_disponibilidade;
        if (currentRecord.localizacao_atual) payload.localizacao_atual = currentRecord.localizacao_atual; // Field alias check
        // Add other fields if necessary based on schema inspection (cidade, estado, etc. if they exist in 'disponivel')
      }

      await directus.request(createItem('disponivel', payload));

      // Removed sync to 'cadastro_motorista' as per instructions

      toast({ title: `Status atualizado para ${newStatus === 'disponivel' ? 'Disponível' : 'Indisponível'}` });
      fetchDrivers(); // Refresh list to get the latest record as current
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({ variant: "destructive", title: "Erro ao atualizar status" });
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return Object.values(driver).some(value =>
      value && String(value).toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDrivers = filteredDrivers.slice(startIndex, startIndex + itemsPerPage);

  const exportToCSV = () => {
    if (filteredDrivers.length === 0) return;

    const headers = displayFields.map(f => f.display_name);
    const rows = filteredDrivers.map(driver =>
      displayFields.map(field => driver[field.field_name] || "")
    );

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `motoristas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || fieldsLoading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cadastro de Motoristas</h2>
          <p className="text-muted-foreground">{filteredDrivers.length} motoristas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setSelectedDriver(null);
            setStartInEditMode(true);
            setIsProfileOpen(true);
          }}>
            <User className="h-4 w-4 mr-2" />
            Adicionar Motorista
          </Button>
          <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
            <SettingsIcon className="h-4 w-4 mr-2" />
            Configurar Campos
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={filteredDrivers.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4 mr-2" />
            Tabela
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cadastro de Motoristas ({filteredDrivers.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Busque por: Nome, CPF, Placas (Caminhão/Carretas), Telefone, Cidade, Estado
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por Nome, CPF, Placas, Telefone, Cidade, Estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Badge variant="secondary" className="absolute right-3 top-2.5">
                {filteredDrivers.length} resultados
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {currentDrivers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum motorista encontrado
              </CardContent>
            </Card>
          ) : (
            currentDrivers.map((driver) => (
              <Card
                key={driver.id}
                className="shadow-card transition-all hover:shadow-md cursor-pointer"
                onClick={() => {
                  setSelectedDriver(driver);
                  setStartInEditMode(false);
                  setIsProfileOpen(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-sm">{driver.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {displayFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{field.display_name}:</span>
                      <span className="text-muted-foreground">{field.display_name}:</span>
                      <span className="font-medium">
                        {field.id === 'status' ? (
                          <Button
                            variant={driver.status_logistica === 'Disponível' ? "default" : "destructive"}
                            size="sm"
                            className={`h-6 text-xs ${driver.status_logistica === 'Disponível' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            onClick={(e) => handleToggleStatus(driver, e)}
                          >
                            {driver.status_logistica}
                          </Button>
                        ) : (
                          driver[field.field_name]
                        )}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {displayFields.map((field) => (
                  <TableHead key={field.id}>{field.display_name}</TableHead>
                ))}
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={displayFields.length + 1} className="text-center py-8 text-muted-foreground">
                    Nenhum motorista encontrado
                  </TableCell>
                </TableRow>
              ) : (
                currentDrivers.map((driver) => (
                  <TableRow
                    key={driver.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedDriver(driver);
                      setStartInEditMode(false);
                      setIsProfileOpen(true);
                    }}
                  >
                    {displayFields.map((field) => (
                      <TableCell key={field.id}>
                        {field.id === 'status' ? (
                          <Button
                            variant={driver.status_logistica === 'Disponível' ? "default" : "destructive"}
                            size="sm"
                            className={`h-6 text-xs w-24 ${driver.status_logistica === 'Disponível' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            onClick={(e) => handleToggleStatus(driver, e)}
                          >
                            {driver.status_logistica}
                          </Button>
                        ) : (
                          driver[field.field_name]
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEditDriver(driver, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pageNum) => (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={() => setCurrentPage(pageNum)}
                isActive={currentPage === pageNum}
                className="cursor-pointer"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <DriverProfileDialog
        open={isProfileOpen}
        onOpenChange={(open) => {
          setIsProfileOpen(open);
          if (!open) {
            setStartInEditMode(false);
          }
        }}
        driverName={selectedDriver?.nome || selectedDriver?.name || null}
        driverData={selectedDriver}
        initialEditMode={startInEditMode}
        onUpdate={(newDriver) => {
          fetchDrivers();
          if (newDriver) {
            setSelectedDriver(newDriver);
            setStartInEditMode(false); // Disable edit mode so it lands on view mode for the just-saved info
          }
        }}
      />

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração de Campos</DialogTitle>
          </DialogHeader>
          <FieldConfigManager />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog Logic Removed - using ProfileDialog for Edits now */}
    </div>
  );
};
