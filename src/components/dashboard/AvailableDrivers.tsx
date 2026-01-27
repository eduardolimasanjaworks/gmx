import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, MapPin, Clock, Truck, List, Grid } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog";
// import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog"; // Duplicate removed
// import { supabase } from "@/integrations/supabase/client"; // Removed Supabase
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { useToast } from "@/hooks/use-toast";


export const AvailableDrivers = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchAvailableDrivers();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAvailableDrivers, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchAvailableDrivers = async () => {
    setIsLoading(true);
    try {

      // 1. Fetch Availability Records (Fetch ALL recent to determine true latest status)
      // We cannot filter by status='disponivel' in the API because that would return old available records 
      // even if the driver is currently unavailable (latest record is 'indisponivel').
      const disponiveis = await directus.request(readItems('disponivel', {
        fields: ['*', 'motorista_id.*'],
        // No status filter here! We need to see 'indisponivel' records to know if they cancel out previous ones.
        sort: ['-date_created'],
        limit: 200 // Fetch enough history to cover active drivers
      }));


      // 2. Filter to keep only the most recent record per driver
      const latestStatusMap = new Map();

      for (const item of disponiveis) {
        const driverId = item.motorista_id?.id || item.motorista_id;
        if (driverId && !latestStatusMap.has(driverId)) {
          // first one found is the latest due to sort -date_created
          latestStatusMap.set(driverId, item);
        }
      }

      // 3. Keep only those whose LATEST status is 'disponivel'
      const activeDrivers = Array.from(latestStatusMap.values())
        .filter((item: any) => item.status === 'disponivel');

      // 4. Fetch Vehicle Info (CRLV) for these drivers
      const driverIds = activeDrivers
        .map((d: any) => d.motorista_id?.id)
        .filter((id: any) => id !== undefined && id !== null);

      let vehiclesMap: Record<number, any> = {};

      if (driverIds.length > 0) {
        // Use Type Assertion 'any' for the filter to bypass partial-safe typing strictness if needed, 
        // though standard SDK usage usually works.
        const vehicles = await directus.request(readItems('crlv', {
          filter: {
            motorista_id: { _in: driverIds }
          }
        }));

        vehicles.forEach((v: any) => {
          // Assuming one truck per driver for the main display, or just take the first found
          if (!vehiclesMap[v.motorista_id]) {
            vehiclesMap[v.motorista_id] = v;
          }
        });
      }

      // 5. Merge Data
      const formattedDrivers = activeDrivers.map((item: any) => {
        const driver = item.motorista_id || {};
        const vehicle = vehiclesMap[driver.id] || {};

        return {
          id: driver.id,
          // Availability Record ID (useful if we want to delete/update the availability status)
          availability_id: item.id,

          name: driver.nome ? `${driver.nome} ${driver.sobrenome || ''}`.trim() : `Motorista #${driver.id}`,
          truck_plate: vehicle.placa_cavalo || "Sem Placa",
          vehicle_type: vehicle.modelo || "Desconhecido", // Or generic "Veículo"

          // Location from the Availability Record
          current_location: item.localizacao_atual || "Local não informado",
          city: item.localizacao_atual, // Simplified mapping
          state: "", // hard to parse state from just a string without structure, keep empty or Try parsing

          // Times
          last_update: item.date_created, // When they said they are available

          status: "available", // If they are in this list, they are per definition available
          current_availability: item, // Pass full record context

          // Original Objects for Dialog
          raw_driver: driver,
          raw_vehicle: vehicle,
          raw_availability: item
        };
      });

      setDrivers(formattedDrivers);

    } catch (error) {
      console.error("Error fetching available drivers:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível buscar a lista de motoristas disponíveis.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(drivers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDrivers = drivers.slice(startIndex, endIndex);

  // Helper handling for clicking a row
  const handleDriverClick = (driver: any) => {
    // Pass the full driver object structure expected by the Dialog if possible, 
    // or just the ID and let it fetch itself (which it does).
    setSelectedDriver({
      id: driver.id,
      name: driver.name,
      ...driver.raw_driver
      // The dialog fetches its own data based on ID, so basic info is enough
    });
    setIsProfileOpen(true);
  };

  if (isLoading && drivers.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Carregando motoristas disponíveis...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Motoristas Disponíveis
          </h2>
          <p className="text-muted-foreground">
            {drivers.length} motoristas prontos para aceitar fretes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={(checked) => setAutoRefresh(checked as boolean)}
            />
            <label
              htmlFor="auto-refresh"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Auto-refresh
            </label>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAvailableDrivers}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {currentDrivers.map((driver) => (
            <Card
              key={driver.availability_id}
              className="shadow-card transition-all hover:shadow-md border-success/20 cursor-pointer"
              onClick={() => handleDriverClick(driver)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm truncate w-40" title={driver.name}>{driver.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {driver.truck_plate || "N/A"}
                    </p>
                  </div>
                  <Badge className="bg-success text-success-foreground text-xs">
                    Disponível
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Truck className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{driver.vehicle_type || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate" title={driver.current_location}>{driver.current_location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{driver.last_update ? new Date(driver.last_update).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Tipo Veículo</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Disponível desde</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDrivers.length > 0 ? (
                currentDrivers.map((driver) => (
                  <TableRow
                    key={driver.availability_id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleDriverClick(driver)}
                  >
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.truck_plate || "N/A"}</TableCell>
                    <TableCell>{driver.vehicle_type || "N/A"}</TableCell>
                    <TableCell>{driver.current_location}</TableCell>
                    <TableCell>{driver.last_update ? new Date(driver.last_update).toLocaleDateString('pt-BR') : "N/A"}</TableCell>
                    <TableCell>{driver.last_update ? new Date(driver.last_update).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "N/A"}</TableCell>
                    <TableCell>
                      <Badge className="bg-success text-success-foreground">Disponível</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum motorista disponível no momento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setCurrentPage(pageNum)}
                    isActive={currentPage === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <DriverProfileDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        driverName={selectedDriver?.name || null}
        driverData={selectedDriver}
      />
    </div>
  );
};

