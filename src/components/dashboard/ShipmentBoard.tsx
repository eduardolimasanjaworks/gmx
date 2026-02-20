import { useState, useMemo } from "react";
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
import { MapPin, DollarSign, CheckCircle, X, Maximize2, Play, AlertTriangle, FileText, Loader2, Mail, Plus, Calendar, Package, Clock } from "lucide-react";
import { ShipmentDetailsDialog } from "@/components/shipment/ShipmentDetailsDialog";
import { ShipmentTimer } from "@/components/shipment/ShipmentTimer";
import { ShipmentTableView } from "@/components/shipment/ShipmentTableView";
import { ShipmentViewControls } from "@/components/shipment/ShipmentViewControls";
import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog";
import { CreateShipmentDialog } from "@/components/shipment/CreateShipmentDialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";

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
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
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
    id: id,
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
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [shipmentToStart, setShipmentToStart] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState<"today" | "month" | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch data from database
  const { embarques, embarquesByStatus, isLoading, error, updateStatus } = useEmbarques();
  const [activeId, setActiveId] = useState<string | null>(null);
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
    setActiveId(active.id as string);
    setActiveShipment(active.data.current?.shipment);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveShipment(null);
      return;
    }

    const activeId = active.id;
    // const overId = over.id; // Unused but available

    const activeData = active.data.current;

    // Correctly identifying drop target data
    const overData = over.data.current;

    if (!activeData || !overData) return;

    const activeStatus = activeData.status;
    const overStatus = overData.status || overData.columnStatus; // Handle dropping on card or column

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

    setActiveId(null);
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

    const statuses: EmbarqueStatus[] = ['new', 'needs_attention', 'sent', 'waiting_confirmation', 'confirmed', 'in_transit', 'waiting_receipt'];

    const columns = statuses.map(status => {
      const config = statusMapping[status];
      const filteredEmbarques = filterByPeriod(embarquesByStatus[status] || []);
      const shipments = filteredEmbarques.map(embarque => ({
        ...embarque,
        deadline: formatDistanceToNow(embarque.created_at, { addSuffix: true, locale: ptBR }),
        hasPaymentProof: false,
        driver: embarque.driver?.name,
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

    // Add "Concluídos" column with period filter
    const delivered = filterByPeriod(embarquesByStatus['delivered'] || [])
      .map(embarque => ({
        ...embarque,
        deadline: formatDistanceToNow(embarque.created_at, { addSuffix: true, locale: ptBR }),
        hasPaymentProof: false,
        driver: embarque.driver?.name,
        pickupDate: formatDate(embarque.pickup_date),
        deliveryDate: formatDate(embarque.delivery_date),
        actual_arrival: embarque.actual_arrival ? formatDistanceToNow(embarque.actual_arrival, { addSuffix: true, locale: ptBR }) : undefined,
      }));

    columns.push({
      title: 'Concluídos',
      status: 'delivered' as EmbarqueStatus,
      color: 'bg-emerald-50 dark:bg-emerald-950/20',
      badgeColor: 'bg-emerald-500',
      shipments: delivered
    });

    return columns;
  }, [embarques, embarquesByStatus, periodFilter]);

  const handleViewDetails = (shipment: any) => {
    setSelectedShipment(shipment);
    setDialogOpen(true);
  };

  const handleDriverClick = (driverName: string) => {
    setSelectedDriver(driverName);
    setDriverDialogOpen(true);
  };

  const handleConfirmGMX = async (shipment: any) => {
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
                          <div
                            className="group relative"
                            style={{
                              zIndex: shipments.length - index
                            }}
                          >
                            {/* Stack "Pages" Effect behind the card */}
                            <div className="absolute top-1 left-1 right-1 bottom-[-4px] bg-slate-200 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 -z-10 mx-2" />
                            <div className="absolute top-2 left-2 right-2 bottom-[-8px] bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 -z-20 mx-4" />

                            <Card
                              className="relative bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden group-hover:-translate-y-1 duration-200"
                            >
                              <CardHeader className="p-3 pb-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-bold text-sm text-foreground">{shipment.driver || "Aguardando Motorista"}</h4>
                                    {shipment.actual_arrival && (
                                      <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-full block w-fit mt-1">
                                        Chegou {shipment.actual_arrival}
                                      </span>
                                    )}
                                  </div>
                                  <ShipmentTimer
                                    deadline={shipment.deadline}
                                    className="text-muted-foreground bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md text-[10px]"
                                    highlight={column.status === "waiting_confirmation"}
                                    realtime={column.status === "waiting_confirmation"}
                                  />
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-2 space-y-3">

                                {/* Route Info */}
                                <div className="space-y-2 relative">
                                  {/* Dotted Line Connector */}
                                  <div className="absolute left-[5px] top-[8px] bottom-[28px] w-0.5 border-l-2 border-dotted border-slate-200 dark:border-slate-700" />

                                  <div className="flex items-start gap-2 text-sm relative z-10">
                                    <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-emerald-50 mt-1 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-xs text-foreground truncate">{shipment.origin}</p>
                                      <p className="text-[10px] text-muted-foreground">Origem</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2 text-sm relative z-10">
                                    <div className="w-2.5 h-2.5 rounded-full border-2 border-rose-500 bg-rose-50 mt-1 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-xs text-foreground truncate">{shipment.destination}</p>
                                      <p className="text-[10px] text-muted-foreground">Destino</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                                {/* Value */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                    <DollarSign className="h-4 w-4" />
                                    <span className="font-bold text-sm">
                                      R$ {shipment.value.toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Tags */}
                                  {shipment.email_content && (
                                    <Badge variant="outline" className="text-[10px] h-5 border-blue-200 text-blue-600 bg-blue-50">
                                      Email
                                    </Badge>
                                  )}
                                </div>

                                {/* Info Rows */}
                                <div className="space-y-1.5 pt-1">
                                  {shipment.delivery_window && (
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Janela: {shipment.delivery_window}
                                    </p>
                                  )}

                                  {shipment.rejected_drivers_count > 0 && (column.status === "new" || column.status === "sent") && (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] border border-red-100">
                                      <X className="w-3 h-3" />
                                      {shipment.rejected_drivers_count} recusaram
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-8 text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(shipment);
                                  }}
                                >
                                  <Maximize2 className="h-3 w-3 mr-1.5" />
                                  Detalhes
                                </Button>

                                {/* Status Specific Actions */}
                                {column.status === "waiting_confirmation" && (
                                  <Button
                                    className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleConfirmGMX(shipment);
                                    }}
                                  >
                                    Confirmar GMX
                                  </Button>
                                )}

                                {column.status === "confirmed" && (
                                  <Button
                                    className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartRide(shipment);
                                    }}
                                  >
                                    Iniciar Corrida
                                  </Button>
                                )}

                              </CardContent>
                            </Card>
                          </div>
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
              <div className="w-[330px] opacity-90 rotate-2 cursor-grabbing">
                <Card className="shadow-2xl bg-white dark:bg-slate-950 border-primary/50">
                  <CardHeader className="p-3 pb-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-sm text-foreground">{activeShipment.driver || "Aguardando Motorista"}</h4>
                      <Badge variant="outline">{activeShipment.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">{activeShipment.origin} ➔ {activeShipment.destination}</p>
                    <p className="text-sm font-bold text-emerald-600 mt-2">R$ {activeShipment.value.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </div>
    </DndContext>
  );
};
