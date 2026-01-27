import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { MapPin, TrendingUp, TrendingDown, Minus, Truck, Package } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface RegionSaturation {
  region: string;
  state: string;
  availableVehicles: number;
  pendingShipments: number;
  saturationLevel: 'excess' | 'balanced' | 'demand';
  saturationScore: number;
}

export function LogisticsSaturationMap() {
  const [selectedRegion, setSelectedRegion] = useState<RegionSaturation | null>(null);

  // Helper to extract UF from string (e.g. "São Paulo - SP" -> "SP")
  const extractState = (location: string) => {
    if (!location) return 'N/A';
    const match = location.match(/[-,\/]\s*([A-Z]{2})\b/i);
    return match ? match[1].toUpperCase() : 'N/A';
  };

  // Fetch drivers by region (REAL)
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers_by_region_real'],
    queryFn: async () => {
      try {
        // Fetch all available drivers
        const response = await directus.request(readItems('disponivel', {
          filter: { status: { _eq: 'disponivel' } },
          fields: ['id', 'local_disponibilidade', 'status'],
          sort: ['-date_created'],
          limit: 100
        }));

        // Map to internal structure
        return response.map((d: any) => ({
          id: d.id,
          state: extractState(d.local_disponibilidade),
          current_location: d.local_disponibilidade || 'Desconhecido',
          availability_status: 'available'
        }));
      } catch (err) {
        console.error("Error fetching map drivers:", err);
        return [];
      }
    },
  });

  // Fetch pending shipments by region (REAL)
  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipments_by_region_real'],
    queryFn: async () => {
      try {
        const response = await directus.request(readItems('embarques', {
          filter: {
            status: { _in: ['new', 'waiting_confirmation'] }
          },
          fields: ['id', 'origin', 'destination', 'status'],
          limit: 100
        }));

        return response.map((s: any) => ({
          id: s.id,
          origin_state: extractState(s.origin),
          destination_state: extractState(s.destination),
          status: s.status
        }));
      } catch (err) {
        console.error("Error fetching map shipments:", err);
        return [];
      }
    },
  });

  // Calculate saturation by region
  const regionsSaturation: RegionSaturation[] = (() => {
    if (!drivers || !shipments) return [];

    const regions: Record<string, RegionSaturation> = {};

    // Count available vehicles by state
    drivers.forEach((driver: any) => {
      if (!driver.state || driver.state === 'N/A') return;

      if (!regions[driver.state]) {
        regions[driver.state] = {
          region: driver.state,
          state: driver.state,
          availableVehicles: 0,
          pendingShipments: 0,
          saturationLevel: 'balanced',
          saturationScore: 0,
        };
      }
      regions[driver.state].availableVehicles++;
    });

    // Count pending shipments by ORIGIN state (demand is where the cargo IS)
    shipments.forEach((shipment: any) => {
      const state = shipment.origin_state;
      if (!state || state === 'N/A') return;

      if (!regions[state]) {
        regions[state] = {
          region: state,
          state: state,
          availableVehicles: 0,
          pendingShipments: 0,
          saturationLevel: 'balanced',
          saturationScore: 0,
        };
      }
      regions[state].pendingShipments++;
    });

    // Calculate saturation level
    Object.values(regions).forEach((region) => {
      const ratio = region.availableVehicles / Math.max(region.pendingShipments, 1);
      region.saturationScore = ratio;

      if (ratio > 2) {
        region.saturationLevel = 'excess'; // Excesso de veículos
      } else if (ratio < 0.5) {
        region.saturationLevel = 'demand'; // Alta demanda
      } else {
        region.saturationLevel = 'balanced'; // Balanceado
      }
    });

    return Object.values(regions).sort((a, b) => b.saturationScore - a.saturationScore);
  })();

  const getSaturationColor = (level: RegionSaturation['saturationLevel']) => {
    switch (level) {
      case 'excess':
        return 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800';
      case 'demand':
        return 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800';
      case 'balanced':
        return 'bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800';
    }
  };

  const getSaturationBadgeVariant = (level: RegionSaturation['saturationLevel']) => {
    switch (level) {
      case 'excess':
        return 'destructive';
      case 'demand':
        return 'default';
      case 'balanced':
        return 'secondary';
    }
  };

  const getSaturationIcon = (level: RegionSaturation['saturationLevel']) => {
    switch (level) {
      case 'excess':
        return <TrendingDown className="h-4 w-4" />;
      case 'demand':
        return <TrendingUp className="h-4 w-4" />;
      case 'balanced':
        return <Minus className="h-4 w-4" />;
    }
  };

  const getSaturationLabel = (level: RegionSaturation['saturationLevel']) => {
    switch (level) {
      case 'excess':
        return 'Excesso de Veículos';
      case 'demand':
        return 'Alta Demanda';
      case 'balanced':
        return 'Balanceado';
    }
  };

  const isLoading = driversLoading || shipmentsLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Saturação Logística
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Clique em uma região para ver detalhes
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px]" />
          ) : regionsSaturation.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {regionsSaturation.map((region) => (
                <button
                  key={region.state}
                  onClick={() => setSelectedRegion(region)}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getSaturationColor(region.saturationLevel)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg">{region.state}</span>
                    {getSaturationIcon(region.saturationLevel)}
                  </div>
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-1 text-sm">
                      <Truck className="h-3 w-3" />
                      <span>{region.availableVehicles} veículos</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Package className="h-3 w-3" />
                      <span>{region.pendingShipments} cargas</span>
                    </div>
                  </div>
                  <Badge
                    variant={getSaturationBadgeVariant(region.saturationLevel)}
                    className="mt-2 w-full justify-center text-xs"
                  >
                    {getSaturationLabel(region.saturationLevel)}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado de saturação disponível</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3">Legenda:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-sm">Excesso de Veículos (Ratio &gt; 2:1)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded" />
                <span className="text-sm">Balanceado (Ratio 0.5-2:1)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span className="text-sm">Alta Demanda (Ratio &lt; 0.5:1)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Region Details Modal */}
      <Dialog open={!!selectedRegion} onOpenChange={(open) => !open && setSelectedRegion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedRegion?.state} - Detalhes
            </DialogTitle>
          </DialogHeader>

          {selectedRegion && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold">{getSaturationLabel(selectedRegion.saturationLevel)}</p>
                </div>
                <Badge variant={getSaturationBadgeVariant(selectedRegion.saturationLevel)} className="text-lg px-4 py-2">
                  {getSaturationIcon(selectedRegion.saturationLevel)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Veículos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {selectedRegion.availableVehicles}
                    </div>
                    <p className="text-xs text-muted-foreground">Disponíveis</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Cargas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {selectedRegion.pendingShipments}
                    </div>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ratio Oferta/Demanda</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedRegion.saturationScore.toFixed(2)}:1
                  </div>
                  <div className="mt-3">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${selectedRegion.saturationLevel === 'excess' ? 'bg-red-500' :
                          selectedRegion.saturationLevel === 'demand' ? 'bg-green-500' :
                            'bg-yellow-500'
                          }`}
                        style={{
                          width: `${Math.min(selectedRegion.saturationScore * 25, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedRegion.saturationLevel === 'excess' &&
                      'Há mais veículos do que demanda. Considere realocar para outras regiões.'}
                    {selectedRegion.saturationLevel === 'balanced' &&
                      'Oferta e demanda estão equilibradas.'}
                    {selectedRegion.saturationLevel === 'demand' &&
                      'Há mais demanda do que veículos disponíveis. Priorize esta região.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
