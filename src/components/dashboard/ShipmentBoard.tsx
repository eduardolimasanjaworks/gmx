import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  useDroppable
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Package, Plus, Upload, Route } from "lucide-react";
import { OfertarMotoristaDialog } from "@/components/shipment/OfertarMotoristaDialog";
import { CsvImportDialog } from "@/components/dashboard/CsvImportDialog";
import { CorrelacionarRotaDialog } from "@/components/dashboard/CorrelacionarRotaDialog";
import { ShipmentDetailsDialog } from "@/components/shipment/ShipmentDetailsDialog";
import { ShipmentTableView } from "@/components/shipment/ShipmentTableView";
import { ShipmentViewControls } from "@/components/shipment/ShipmentViewControls";
import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog";
import { CreateShipmentDialog } from "@/components/shipment/CreateShipmentDialog";
import { OfertaFilaHumanaPanel } from "@/components/dashboard/OfertaFilaHumanaPanel";
import { ShipmentKanbanCard } from "@/components/shipment/ShipmentKanbanCard";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useEmbarques } from "@/hooks/useEmbarques";
import { statusMapping, EmbarqueStatus } from "@/types/embarque";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, isToday, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { resolveDropStatus } from "@/lib/shipmentKanbanDnd";

// Draggable Card Wrapper
function DraggableShipmentCard({ shipment, column, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: shipment.id,
    data: {
      type: "Shipment",
      shipment,
      status: column.status
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.08 : 1,
    willChange: 'transform',
  };

  // Create a custom handle that excludes interactive elements
  const handleProps = {
    ...listeners,
    ...attributes,
    onPointerDown: (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      // Se clicar em botão, link ou elemento interativo, não inicia drag
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target.closest('input') || target.closest('textarea') || target.closest('select')) {
        e.stopPropagation();
        return;
      }
      // Chama o listener original se não for elemento interativo
      if (listeners?.onPointerDown) {
        listeners.onPointerDown(e as any);
      }
    },
    className: "cursor-grab active:cursor-grabbing",
    style: { touchAction: 'none' } as React.CSSProperties
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div {...handleProps}>
        {children}
      </div>
    </div>
  );
}

// Helper for Droppable Column (Empty state target)
function DroppableColumn({ id, children, className }: any) {
  const { setNodeRef } = useDroppable({
    id: `column:${id}`,
    data: {
      columnStatus: id,
      type: "Column"
    }
  });

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

export const ShipmentBoard = () => {
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [focusColumn, setFocusColumn] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedDriverData, setSelectedDriverData] = useState<any>(null);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [shipmentToStart, setShipmentToStart] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState<"today" | "month" | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [correlacionarOpen, setCorrelacionarOpen] = useState(false);
  const [ofertarEmbarque, setOfertarEmbarque] = useState<any>(null);
  const { toast } = useToast();

  // Fetch data from database
  const { embarques, embarquesByStatus, isLoading, error, updateStatus } = useEmbarques();
  const queryClient = useQueryClient();
  const embarquesRotaPendentes = useMemo(
    () =>
      embarques.filter(
        (e: { rota_status?: string }) => e.rota_status === "pendente",
      ),
    [embarques],
  );
  const [activeShipment, setActiveShipment] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // 10px movement required to start drag
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveShipment(active.data.current?.shipment);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveShipment(null);
      return;
    }

    const activeId = active.id;

    const activeData = active.data.current;

    // Correctly identifying drop target data
    const overData = over.data.current;

    if (!activeData || !overData) {
      setActiveShipment(null);
      return;
    }

    const activeStatus = activeData.status;
    const overStatus = resolveDropStatus(over.id, overData); // Handle dropping on card or column

    if (!overStatus) {
      setActiveShipment(null);
      return;
    }

    if (activeStatus !== overStatus) {
      // Dropped in a new column!
      try {
        // Optimistic UI update handled by React Query invalidation in hook
        await updateStatus(String(activeId), overStatus as EmbarqueStatus);
        toast({
          title: "Status Atualizado",
          description: `Embarque movido para ${statusMapping[overStatus as EmbarqueStatus].title}`,
        });
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Erro ao mover",
          description: "Não foi possível atualizar o status."
        });
      }
    }

    setActiveShipment(null);
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  // Transform database data into columns format with period filter
  const shipmentColumns = useMemo(() => {
    const filterByPeriod = (embarques: any[]) => {
      if (periodFilter === "today") {
        return embarques.filter(e => isToday(new Date(e.created_at)));
      } else if (periodFilter === "month") {
        return embarques.filter(e => isThisMonth(new Date(e.created_at)));
      }
      return embarques; // all
    };

    const formatDate = (dateString: string | null) => {
      if (!dateString) return null;
      try {
        return new Date(dateString).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return null;
      }
    };

    const statuses: EmbarqueStatus[] = [
      'new',
      'needs_attention',
      'sent',
      'waiting_confirmation',
      'confirmed',
      'in_transit',
      'waiting_receipt',
      'delivered',
      'no_show'
    ];

    const columns = statuses.map(status => {
      const config = statusMapping[status];
      const filteredEmbarques = filterByPeriod(embarquesByStatus[status] || []);
      const shipments = filteredEmbarques.map(embarque => ({
        ...embarque,
        deadline: formatDistanceToNow(embarque.created_at, { addSuffix: true, locale: ptBR }),
        hasPaymentProof: false,
        driver_name: embarque.driver?.name || embarque.driver_name || null,
        tipo_veiculo: embarque.driver?.tipo_veiculo || embarque.tipo_veiculo || null,
        pickupDate: formatDate(embarque.pickup_date),
        deliveryDate: formatDate(embarque.delivery_date),
        actual_arrival: embarque.actual_arrival ? formatDistanceToNow(embarque.actual_arrival, { addSuffix: true, locale: ptBR }) : undefined,
      }));

      return {
        title: config.title,
        status,
        color: config.color,
        badgeColor: config.badgeColor,
        shipments
      };
    });

    return columns;
  }, [embarques, embarquesByStatus, periodFilter]);

  const handleViewDetails = (shipment: any) => {
    setSelectedShipment(shipment);
    setDialogOpen(true);
  };

  const handleDriverClick = (driverOrName: any) => {
    if (typeof driverOrName === 'string') {
      setSelectedDriver(driverOrName);
      setSelectedDriverData(null);
      setDriverDialogOpen(true);
      return;
    }
    const name = driverOrName?.name || driverOrName?.nome || null;
    setSelectedDriver(name);
    setSelectedDriverData(driverOrName || null);
    setDriverDialogOpen(true);
  };

  const handleConfirmGMX = async (shipment: any) => {
    if (!shipment.gr_feito) {
      toast({
        variant: "destructive",
        title: "Validação pendente",
        description: "Marque Feito GR antes de avançar o card.",
      });
      return;
    }
    try {
      await updateStatus(shipment.id, 'confirmed');
      toast({
        title: "GMX Confirmado",
        description: `Embarque #${shipment.id} movido para Confirmados.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao confirmar",
        description: "Não foi possível atualizar o status."
      });
    }
  };

  const handleStartRide = async (shipment: any) => {
    if (!shipment.gr_feito) {
      toast({
        variant: "destructive",
        title: "Validação pendente",
        description: "Marque Feito GR antes de iniciar a corrida.",
      });
      return;
    }
    const emailContent = String(shipment.email_content || "").toLowerCase();
    if (emailContent.includes("não foi aceita") || emailContent.includes("nao foi aceita")) {
      toast({
        variant: "destructive",
        title: "Carga não aceita no SMART",
        description: "Esta carga não foi aceita no SMART, verificar a programação.",
      });
      return;
    }
    // Mock check: always assume receipt exists or allow override
    const mockReceiptExists = true;

    if (!mockReceiptExists) {
      setShipmentToStart(shipment);
      setAlertDialogOpen(true);
    } else {
      await startRide(shipment);
    }
  };

  const startRide = async (shipment: any) => {
    try {
      await updateStatus(shipment.id, 'in_transit');
      toast({
        title: "Corrida Iniciada",
        description: `Embarque #${shipment.id} agora está Em Trânsito.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao iniciar",
        description: "Não foi possível atualizar o status."
      });
    }
  };

  const handleForceStart = async () => {
    if (shipmentToStart) {
      await startRide(shipmentToStart);
      setAlertDialogOpen(false);
      setShipmentToStart(null);
    }
  };

  const visibleColumns = focusColumn
    ? shipmentColumns.filter(col => col.status === focusColumn)
    : shipmentColumns;

  const getPaginatedShipments = (shipments: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return shipments.slice(startIndex, endIndex);
  };

  const getTotalPages = (shipments: any[]) => {
    return Math.ceil(shipments.length / itemsPerPage);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Embarques - Ofertas de Fretes
          </h2>
          <p className="text-muted-foreground">
            Acompanhe o status de todas as ofertas
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-64 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Debug Display
  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded-md">
        <h3 className="font-bold">Erro ao carregar embarques:</h3>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }



  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <ShipmentDetailsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          shipment={selectedShipment}
        />

        <DriverProfileDialog
          open={driverDialogOpen}
          onOpenChange={setDriverDialogOpen}
          driverName={selectedDriver}
          driverData={selectedDriverData || undefined}
        />

        <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Comprovante de Pagamento Ausente
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  O comprovante de pagamento do motorista não foi anexado.
                </p>
                <p className="font-medium text-foreground">
                  Deseja iniciar a corrida mesmo assim?
                </p>
                <p className="text-xs text-muted-foreground">
                  Caso prossiga, o embarque ficará marcado com aviso de comprovante pendente.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleForceStart} className="bg-warning hover:bg-warning/90">
                Prosseguir Mesmo Assim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CreateShipmentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        <CsvImportDialog
          open={csvImportOpen}
          onOpenChange={setCsvImportOpen}
          mode="embarques"
        />

        <CorrelacionarRotaDialog
          open={correlacionarOpen}
          onOpenChange={setCorrelacionarOpen}
          pendentes={embarquesRotaPendentes}
        />

        <OfertarMotoristaDialog
          open={!!ofertarEmbarque}
          onOpenChange={(open) => !open && setOfertarEmbarque(null)}
          embarque={ofertarEmbarque}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['embarques'] })}
        />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Embarques - Ofertas de Fretes
            </h2>
            <p className="text-muted-foreground">
              Acompanhe o status de todas as ofertas (Total: {embarques.length})
            </p>
          </div>

          <div className="flex items-center gap-3">
            {embarquesRotaPendentes.length > 0 && (
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => setCorrelacionarOpen(true)}
              >
                <Route className="mr-2 h-4 w-4" />
                Rotas pendentes ({embarquesRotaPendentes.length})
              </Button>
            )}
            <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Button
              className="bg-gradient-primary"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Oferta
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Período:</span>
              <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="all">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <OfertaFilaHumanaPanel />

        <ShipmentViewControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(items) => {
            setItemsPerPage(items);
            setCurrentPage(1);
          }}
          focusColumn={focusColumn}
          onFocusColumnChange={(col) => {
            setFocusColumn(col);
            setCurrentPage(1);
          }}
          columns={shipmentColumns}
        />

        {viewMode === "card" ? (
          <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)] items-start">
            {visibleColumns.map((column) => {
              // Render ALL shipments, no pagination logic
              const shipments = column.shipments;

              return (
                <div
                  key={column.status}
                  className="flex-shrink-0 w-[350px] flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative z-0"
                >
                  {/* Column Header */}
                  <div className={`p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-inherit z-10 rounded-t-xl backdrop-blur-sm ${column.color}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${column.badgeColor}`} />
                      <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">{column.title}</h3>
                    </div>
                    <Badge variant="secondary" className="bg-white/50 dark:bg-black/20 text-xs">
                      {shipments.length}
                    </Badge>
                  </div>

                  {/* Scrollable Stack Area */}
                  {/* Sortable Context for Column Items */}
                  <SortableContext
                    items={shipments.map((s: any) => s.id)}
                    strategy={verticalListSortingStrategy}
                    id={column.status}
                  >
                    <DroppableColumn id={column.status} className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                      {shipments.map((shipment, index) => (
                        <DraggableShipmentCard key={shipment.id} shipment={shipment} column={column}>
                          <ShipmentKanbanCard
                            shipment={shipment}
                            columnStatus={column.status}
                            zIndex={shipments.length - index}
                            onOffer={setOfertarEmbarque}
                            onViewDetails={handleViewDetails}
                            onConfirmGMX={handleConfirmGMX}
                            onStartRide={handleStartRide}
                            onOpenDriver={handleDriverClick}
                          />
                        </DraggableShipmentCard>
                      ))}

                      {shipments.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-50 min-h-[100px]">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                            <Package className="w-6 h-6" />
                          </div>
                          <p className="text-xs">Solte aqui</p>
                        </div>
                      )}

                    </DroppableColumn>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleColumns.map((column) => {
              // ... Existing table view logic maintained but simplified if needed ...
              const paginatedShipments = getPaginatedShipments(column.shipments);
              const totalPages = getTotalPages(column.shipments);

              return (
                <Card key={column.status} className={column.color}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{column.title}</CardTitle>
                      <Badge className={column.badgeColor}>
                        {column.shipments.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ShipmentTableView
                      shipments={paginatedShipments}
                      status={column.status}
                      onViewDetails={handleViewDetails}
                      onDriverClick={handleDriverClick}
                    />

                    {totalPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {activeShipment ? (
              <div className="w-[350px] cursor-grabbing">
                <ShipmentKanbanCard
                  shipment={activeShipment}
                  columnStatus={String(activeShipment.status || "new")}
                  preview
                />
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </div>
    </DndContext>
  );
};
