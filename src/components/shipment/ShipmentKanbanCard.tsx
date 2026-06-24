/**
 * Card reutilizavel do kanban de embarques.
 * Usa o mesmo visual tanto na coluna quanto no overlay de drag.
 * Isso reduz salto visual e deixa o arraste mais fluido.
 */
import { AlertTriangle, Clock, DollarSign, Maximize2, MessageCircle, Package, Truck, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmbarqueGrCheckbox } from '@/components/shipment/EmbarqueGrCheckbox';
import { ShipmentTimer } from '@/components/shipment/ShipmentTimer';
import { cn } from '@/lib/utils';

interface Props {
  shipment: any;
  columnStatus: string;
  onOffer?: (shipment: any) => void;
  onViewDetails?: (shipment: any) => void;
  onConfirmGMX?: (shipment: any) => void;
  onStartRide?: (shipment: any) => void;
  onOpenDriver?: (driver: any) => void;
  preview?: boolean;
  zIndex?: number;
}

export function ShipmentKanbanCard({
  shipment,
  columnStatus,
  onOffer,
  onViewDetails,
  onConfirmGMX,
  onStartRide,
  onOpenDriver,
  preview = false,
  zIndex,
}: Props) {
  const interactive = !preview;
  const driverName =
    shipment.driver_name || shipment.driver?.name || shipment.driver || 'Aguardando Motorista';
  const vehicleType =
    shipment.tipo_veiculo || shipment.driver?.tipo_veiculo || shipment.vehicle_type || shipment.vehicleType || '-';

  return (
    <div className={cn('group relative', preview && 'rotate-2 scale-[1.01]')} style={zIndex ? { zIndex } : undefined}>
      {!preview && (
        <>
          <div className="absolute top-1 left-1 right-1 bottom-[-4px] bg-slate-200 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 -z-10 mx-2" />
          <div className="absolute top-2 left-2 right-2 bottom-[-8px] bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 -z-20 mx-4" />
        </>
      )}

      <Card
        className={cn(
          'relative overflow-hidden border-slate-200 bg-white shadow-sm transition-all dark:border-slate-800 dark:bg-slate-950',
          interactive ? 'hover:-translate-y-1 hover:shadow-md duration-200' : 'shadow-2xl border-primary/40',
        )}
      >
        <CardHeader className="p-3 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                {interactive && shipment.driver?.id ? (
                  <button
                    type="button"
                    className="font-bold text-sm text-foreground underline-offset-2 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDriver?.(shipment.driver);
                    }}
                  >
                    {driverName}
                  </button>
                ) : (
                  <h4 className="font-bold text-sm text-foreground">{driverName}</h4>
                )}
                {vehicleType && vehicleType !== '-' && (
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {vehicleType}
                  </Badge>
                )}
              </div>
              {shipment.rota_status === 'pendente' && (
                <span className="mt-1 block w-fit rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Rota pendente
                </span>
              )}
              {shipment.actual_arrival && (
                <span className="mt-1 block w-fit rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                  Chegou {shipment.actual_arrival}
                </span>
              )}
            </div>
            <ShipmentTimer
              deadline={shipment.deadline}
              className="bg-slate-100 px-2 py-1 text-[10px] text-muted-foreground dark:bg-slate-900"
              highlight={columnStatus === 'waiting_confirmation'}
              realtime={interactive && columnStatus === 'waiting_confirmation'}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-3 pt-2">
          <div className="relative space-y-2">
            <div className="absolute left-[5px] top-[8px] bottom-[28px] w-0.5 border-l-2 border-dotted border-slate-200 dark:border-slate-700" />
            <div className="relative z-10 flex items-start gap-2 text-sm">
              <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-emerald-500 bg-emerald-50" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{shipment.origin}</p>
                <p className="text-[10px] text-muted-foreground">Origem</p>
              </div>
            </div>
            <div className="relative z-10 flex items-start gap-2 text-sm">
              <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-rose-500 bg-rose-50" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{shipment.destination}</p>
                <p className="text-[10px] text-muted-foreground">Destino</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-bold">R$ {Number(shipment.value || 0).toLocaleString()}</span>
            </div>
            {shipment.email_content && (
              <Badge variant="outline" className="h-5 border-blue-200 bg-blue-50 text-[10px] text-blue-600">
                Email
              </Badge>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Truck className="h-3 w-3" />
              Placas: {shipment.placa_cavalo || shipment.truck_plate || '-'}
            </p>
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Truck className="h-3 w-3" />
              Tipo Veículo: {vehicleType}
            </p>
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              Motorista: {driverName}
            </p>
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Package className="h-3 w-3" />
              Quantidade: {shipment.quantidade_kg || shipment.palets || shipment.quantidade || '-'}
            </p>
            {shipment.delivery_window && (
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Janela: {shipment.delivery_window}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <EmbarqueGrCheckbox
                embarqueId={shipment.id}
                grFeito={shipment.gr_feito}
                grFeitoEm={shipment.gr_feito_em}
                grFeitoPorNome={shipment.gr_feito_por_nome}
                compact
              />
            </div>
            <div className="flex gap-1">
              <Badge variant={(shipment.gr_ok ?? shipment.gr_feito) ? 'default' : 'secondary'} className="text-[10px]">
                GR OK {(shipment.gr_ok ?? shipment.gr_feito) ? 'SIM' : 'NÃO'}
              </Badge>
              <Badge variant={shipment.placas_ok ? 'default' : 'secondary'} className="text-[10px]">
                PLACAS OK {shipment.placas_ok ? 'SIM' : 'NÃO'}
              </Badge>
            </div>
            {shipment.rejected_drivers_count > 0 && (columnStatus === 'new' || columnStatus === 'sent') && (
              <div className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] text-red-600">
                <X className="h-3 w-3" />
                {shipment.rejected_drivers_count} recusaram
              </div>
            )}
            {String(shipment.email_content || '').toLowerCase().includes('não foi aceita') && (
              <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                Não aceita no SMART
              </div>
            )}
          </div>

          {interactive && (
            <>
              {columnStatus === 'new' && shipment.rota_status !== 'pendente' && (
                <Button className="mb-2 h-8 w-full text-xs" onClick={(e) => { e.stopPropagation(); onOffer?.(shipment); }}>
                  <MessageCircle className="mr-1.5 h-3 w-3" />
                  Ver ranking e ofertar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full bg-slate-50 text-xs dark:bg-slate-900"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails?.(shipment);
                }}
              >
                <Maximize2 className="mr-1.5 h-3 w-3" />
                Detalhes
              </Button>
              {columnStatus === 'waiting_confirmation' && (
                <Button className="h-8 w-full bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={(e) => { e.stopPropagation(); onConfirmGMX?.(shipment); }}>
                  Confirmar GMX
                </Button>
              )}
              {columnStatus === 'confirmed' && (
                <Button className="h-8 w-full bg-blue-600 text-xs text-white hover:bg-blue-700" onClick={(e) => { e.stopPropagation(); onStartRide?.(shipment); }}>
                  Iniciar corrida
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
