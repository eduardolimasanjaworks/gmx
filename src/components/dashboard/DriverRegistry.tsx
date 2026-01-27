import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, User, FileText, List, Grid, Download, Filter, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog";

const mockDrivers = [
  {
    id: 1,
    name: "João Silva",
    cpf: "123.456.789-00",
    plate: "ABC-1234",
    status: "regular",
    phone: "(11) 98765-4321",
    lastUpdate: "Há 2 dias",
    lastFreight: "Há 5 dias",
    location: "São Paulo, SP",
    state: "SP",
  },
  {
    id: 2,
    name: "Carlos Lima",
    cpf: "234.567.890-11",
    plate: "DEF-5678",
    status: "attention",
    phone: "(21) 97654-3210",
    lastUpdate: "Há 5 dias",
    lastFreight: "Há 45 dias",
    location: "Rio de Janeiro, RJ",
    state: "RJ",
  },
  {
    id: 3,
    name: "Pedro Santos",
    cpf: "345.678.901-22",
    plate: "GHI-9012",
    status: "irregular",
    phone: "(31) 96543-2109",
    lastUpdate: "Há 15 dias",
    lastFreight: "Há 90 dias",
    location: "Belo Horizonte, MG",
    state: "MG",
  },
  {
    id: 4,
    name: "Maria Costa",
    cpf: "456.789.012-33",
    plate: "JKL-3456",
    status: "regular",
    phone: "(11) 95432-1098",
    lastUpdate: "Há 1 dia",
    lastFreight: "Há 2 dias",
    location: "Campinas, SP",
    state: "SP",
  },
  {
    id: 5,
    name: "Roberto Alves",
    cpf: "567.890.123-44",
    plate: "MNO-7890",
    status: "irregular",
    phone: "(41) 94321-0987",
    lastUpdate: "Há 30 dias",
    lastFreight: "Há 120 dias",
    location: "Curitiba, PR",
    state: "PR",
  },
];

const statusConfig = {
  regular: { label: "Regular", className: "bg-status-regular text-white" },
  attention: { label: "Atenção", className: "bg-status-attention text-white" },
  irregular: { label: "Irregular", className: "bg-status-irregular text-white" },
};

export const DriverRegistry = () => {
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [daysWithoutFreight, setDaysWithoutFreight] = useState<string>("");
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const itemsPerPage = 20;

  // Aplicar filtros
  const filteredDrivers = mockDrivers.filter((driver) => {
    const matchesSearch = 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.cpf.includes(searchTerm) ||
      driver.plate.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || driver.status === statusFilter;
    
    const matchesState = stateFilter === "all" || driver.state === stateFilter;

    const matchesInactivity = !daysWithoutFreight || 
      parseInt(driver.lastFreight.match(/\d+/)?.[0] || "0") >= parseInt(daysWithoutFreight);

    return matchesSearch && matchesStatus && matchesState && matchesInactivity;
  });
  
  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDrivers = filteredDrivers.slice(startIndex, endIndex);

  const states = [...new Set(mockDrivers.map(d => d.state))].sort();

  const exportToCSV = () => {
    const headers = ["Nome", "CPF", "Placa", "Telefone", "Status", "Localização", "Último Frete"];
    const rows = filteredDrivers.map(driver => [
      driver.name,
      driver.cpf,
      driver.plate,
      driver.phone,
      statusConfig[driver.status as keyof typeof statusConfig].label,
      driver.location,
      driver.lastFreight,
    ]);

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

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStateFilter("all");
    setDaysWithoutFreight("");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || stateFilter !== "all" || daysWithoutFreight;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Cadastro de Motoristas
          </h2>
          <p className="text-muted-foreground">
            {filteredDrivers.length} motoristas {hasActiveFilters && `(filtrados de ${mockDrivers.length})`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredDrivers.length === 0}
          >
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
          <Button className="bg-gradient-primary">
            <User className="mr-2 h-4 w-4" />
            Novo Motorista
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filtros Avançados</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou placa..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status cadastral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="attention">Atenção</SelectItem>
                  <SelectItem value="irregular">Irregular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado/Região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {states.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input
                type="number"
                placeholder="Dias sem frete (mínimo)"
                value={daysWithoutFreight}
                onChange={(e) => setDaysWithoutFreight(e.target.value)}
                min="0"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary">
                  Busca: {searchTerm}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={() => setSearchTerm("")}
                  >
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary">
                  Status: {statusConfig[statusFilter as keyof typeof statusConfig]?.label || statusFilter}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={() => setStatusFilter("all")}
                  >
                    ×
                  </button>
                </Badge>
              )}
              {stateFilter !== "all" && (
                <Badge variant="secondary">
                  Estado: {stateFilter}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={() => setStateFilter("all")}
                  >
                    ×
                  </button>
                </Badge>
              )}
              {daysWithoutFreight && (
                <Badge variant="secondary">
                  Sem frete há {daysWithoutFreight}+ dias
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={() => setDaysWithoutFreight("")}
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {viewMode === "grid" ? (
        <>
          {currentDrivers.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum motorista encontrado com os filtros aplicados
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {currentDrivers.map((driver) => (
                <Card 
                  key={driver.id} 
                  className="shadow-card transition-all hover:shadow-md cursor-pointer"
                  onClick={() => {
                    setSelectedDriver(driver.name);
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
                      <Badge
                        className={
                          statusConfig[driver.status as keyof typeof statusConfig]
                            .className
                        }
                      >
                        {
                          statusConfig[driver.status as keyof typeof statusConfig]
                            .label
                        }
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Placa:</span>
                      <span className="font-medium">{driver.plate}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{driver.phone}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Localização:</span>
                      <span className="font-medium">{driver.location}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Último frete:</span>
                      <span className="font-medium">{driver.lastFreight}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Último Frete</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum motorista encontrado com os filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                currentDrivers.map((driver) => (
                  <TableRow 
                    key={driver.id} 
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedDriver(driver.name);
                      setIsProfileOpen(true);
                    }}
                  >
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.cpf}</TableCell>
                    <TableCell>{driver.plate}</TableCell>
                    <TableCell>{driver.phone}</TableCell>
                    <TableCell>{driver.location}</TableCell>
                    <TableCell>{driver.lastFreight}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusConfig[driver.status as keyof typeof statusConfig]
                            .className
                        }
                      >
                        {
                          statusConfig[driver.status as keyof typeof statusConfig]
                            .label
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDriver(driver.name);
                          setIsProfileOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
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

      <DriverProfileDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        driverName={selectedDriver}
      />
    </div>
  );
};
