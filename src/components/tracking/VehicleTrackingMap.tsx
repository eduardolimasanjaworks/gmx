import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock, CalendarIcon, Crosshair, Map as MapIcon, RotateCcw, XCircle } from "lucide-react";
import { AdvancedMap } from "@/components/ui/interactive-map";
import { useQuery } from "@tanstack/react-query";
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createItem } from "@directus/sdk";
import { useToast } from "@/components/ui/use-toast";

// Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const VehicleTrackingMap = () => {
  const [searchParams] = useSearchParams();
  const urlDate = searchParams.get('load_date');
  const urlLat = searchParams.get('load_lat');
  const urlLng = searchParams.get('load_lng');

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    urlLat && urlLng ? [Number(urlLat), Number(urlLng)] : [-15.7801, -47.9292]
  );
  const [mapZoom, setMapZoom] = useState<number>(urlLat && urlLng ? 8 : 4);

  // Filters State
  const [timeTravelDate, setTimeTravelDate] = useState<Date | undefined>(
    urlDate ? new Date(urlDate) : undefined
  );
  const [radiusKm, setRadiusKm] = useState<number[]>([150]); // Default slightly larger for loads
  const [originPoint, setOriginPoint] = useState<[number, number] | null>(
    urlLat && urlLng ? [Number(urlLat), Number(urlLng)] : null
  );
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);

  // Saving locations
  const [isSavingLoc, setIsSavingLoc] = useState(false);
  const [savedLocName, setSavedLocName] = useState("");
  const { toast } = useToast();

  const { refreshToken, user } = useAuth();

  const fetchDrivers = async () => {
    let filterQuery: any = undefined;

    if (timeTravelDate) {
      const endOfDay = new Date(timeTravelDate);
      endOfDay.setHours(23, 59, 59, 999);

      filterQuery = {
        date_created: {
          _lte: endOfDay.toISOString()
        }
      };
    }

    const queryOpts: any = {
      fields: ['*', 'motorista_id.*'],
      sort: ['-date_created'],
      limit: -1
    };

    if (filterQuery) {
      queryOpts.filter = filterQuery;
    }

    const disponiveis = await directus.request(readItems('disponivel', queryOpts));

    // Group by driver to get latest location in the given timeframe
    const latestStatusMap = new Map();
    for (const item of disponiveis) {
      const driverId = item.motorista_id?.id || item.motorista_id;
      if (driverId && !latestStatusMap.has(driverId)) {
        latestStatusMap.set(driverId, item);
      }
    }

    return Array.from(latestStatusMap.values())
      .filter((item: any) => item.disponivel === true);
  };

  const { data: fetchedDrivers = [], isLoading, isError } = useQuery({
    queryKey: ['tracking-map-drivers', timeTravelDate?.toISOString()],
    queryFn: async () => {
      try {
        return await fetchDrivers();
      } catch (error: any) {
        if (error?.response?.status === 401 || error?.message === "Token expired.") {
          await refreshToken();
          return await fetchDrivers();
        }
        throw error;
      }
    },
    refetchInterval: timeTravelDate ? false : 15000 // Don't auto-refresh if looking at history
  });

  // Apply Geolocation Filter (Haversine)
  const allAvailableDrivers = useMemo(() => {
    let filtered = [...fetchedDrivers];

    if (originPoint) {
      const MAX_KM = radiusKm[0];
      filtered = filtered.filter((d: any) => {
        if (!d.latitude || !d.longitude) return false;
        const dist = getDistanceFromLatLonInKm(
          originPoint[0], originPoint[1],
          Number(d.latitude), Number(d.longitude)
        );
        return dist <= MAX_KM;
      });
    }

    return filtered;
  }, [fetchedDrivers, originPoint, radiusKm]);

  // Apenas os motoristas com coordenadas GPS vão para o mapa
  const drivers = allAvailableDrivers.filter((d: any) =>
    d.latitude && d.longitude &&
    !isNaN(Number(d.latitude)) && !isNaN(Number(d.longitude))
  );

  const markers = drivers.map((d: any) => ({
    id: d.id,
    position: [Number(d.latitude), Number(d.longitude)] as [number, number],
    color: 'blue',
    size: 'medium',
    popup: {
      title: `${d.motorista_id?.nome || 'Motorista'} ${d.motorista_id?.sobrenome || ''}`,
      content: `${d.localizacao_atual || 'Localização não informada'}\nVeículo: ${d.motorista_id?.tipo_veiculo || 'N/A'}`,
      image: d.motorista_id?.foto ? `http://91.99.137.101:8057/assets/${d.motorista_id.foto}` : undefined
    },
    driverData: d
  }));

  // Add origin point circle
  const circles = originPoint ? [{
    center: originPoint,
    radius: radiusKm[0] * 1000, // convert km to meters for leaflet
    style: { color: '#4f46e5', weight: 2, fillOpacity: 0.1 },
    popup: `Raio de busca: ${radiusKm[0]}km`
  }] : [];

  const { data: driverHistory = [] } = useQuery({
    queryKey: ['driver-history', selectedDriver?.motorista_id?.id || selectedDriver?.motorista_id],
    enabled: !!selectedDriver,
    queryFn: async () => {
      const motoristaId = selectedDriver.motorista_id?.id || selectedDriver.motorista_id;
      if (!motoristaId) return [];
      try {
        const history = await directus.request(readItems('historico_localizacao', {
          filter: { motorista_id: { _eq: motoristaId } },
          sort: ['date_created'],
          limit: 100
        }));
        return history;
      } catch (err) {
        return [];
      }
    }
  });

  const polylines = useMemo(() => {
    const lines: any[] = [];
    if (!selectedDriver) return lines;

    const currentLat = Number(selectedDriver.latitude);
    const currentLng = Number(selectedDriver.longitude);

    // 1. Draw Path History
    if (driverHistory.length > 0) {
      const historyPositions = driverHistory
        .filter((h: any) => h.latitude && h.longitude)
        .map((h: any) => [Number(h.latitude), Number(h.longitude)] as [number, number]);

      if (historyPositions.length > 0) {
        // Connect the last history point to the current location
        historyPositions.push([currentLat, currentLng]);
        lines.push({
          positions: historyPositions,
          style: { color: '#6366f1', weight: 4, dashArray: '5, 10' },
          popup: 'Histórico de Trajetória (De onde veio)'
        });
      }
    }

    // 2. Draw Future Path to the Target Load (if origin filter is active)
    if (originPoint && currentLat && currentLng) {
      lines.push({
        positions: [[currentLat, currentLng], originPoint],
        style: { color: '#10b981', weight: 4, dashArray: '8, 8' },
        popup: 'Trajetória Prevista até a Origem da Carga'
      });
    }

    // 3. Draw Future Path to the next defined destination of the Driver (if he is moving somewhere else)
    if (selectedDriver.destino_lat && selectedDriver.destino_lng && currentLat && currentLng) {
      lines.push({
        positions: [[currentLat, currentLng], [Number(selectedDriver.destino_lat), Number(selectedDriver.destino_lng)]],
        style: { color: '#f59e0b', weight: 3, dashArray: '5, 5' },
        popup: 'Indo para o próximo Destino'
      });
    }

    return lines;
  }, [selectedDriver, driverHistory, originPoint]);

  // Merge Custom markers for Future and History destinations of the Selected Driver
  const mapMarkers = useMemo(() => {
    const defaultMarkers = [...markers];

    if (selectedDriver) {
      const currentLat = Number(selectedDriver.latitude);
      const currentLng = Number(selectedDriver.longitude);

      // Add driver's planned destination pin if it exists
      if (selectedDriver.destino_lat && selectedDriver.destino_lng) {
        defaultMarkers.push({
          id: 'driver-dest',
          position: [Number(selectedDriver.destino_lat), Number(selectedDriver.destino_lng)],
          color: 'orange',
          size: 'medium',
          popup: {
            title: 'Destino Final do Motorista',
            content: selectedDriver.destino_atual || 'Destino Relatado'
          }
        });
      }

      // Add past starting point if history exists
      if (driverHistory.length > 0) {
        const firstP = driverHistory[0];
        if (firstP.latitude && firstP.longitude) {
          defaultMarkers.push({
            id: 'driver-start',
            position: [Number(firstP.latitude), Number(firstP.longitude)],
            color: 'purple',
            size: 'small',
            popup: {
              title: 'Ponto de Partida Histórico',
              content: new Date(firstP.date_created).toLocaleString()
            }
          });
        }
      }
    }

    return defaultMarkers;
  }, [markers, selectedDriver, driverHistory]);

  const handleMarkerClick = (marker: any) => {
    const driver = drivers.find((d: any) => d.id === marker.id);
    setSelectedDriver(driver);
    setMapCenter(marker.position);
    setMapZoom(12);
  };

  const handleDriverSelect = (driver: any) => {
    setSelectedDriver(driver);
    if (driver.latitude && driver.longitude) {
      setMapCenter([Number(driver.latitude), Number(driver.longitude)]);
      setMapZoom(12);
    }
  };

  const handleMapClick = (latlng: any) => {
    if (isSelectingOrigin) {
      setOriginPoint([latlng.lat, latlng.lng]);
      setIsSelectingOrigin(false);
      setMapCenter([latlng.lat, latlng.lng]);
    }
  };

  const getSynergyScore = (driver: any) => {
    if (!originPoint || !timeTravelDate) return null;

    let score = 0;

    // Distância score
    const dist = getDistanceFromLatLonInKm(originPoint[0], originPoint[1], Number(driver.latitude), Number(driver.longitude));
    if (dist <= 50) score += 3;
    else if (dist <= 150) score += 2;
    else if (dist <= 300) score += 1;

    // Tempo Score
    const loadDate = new Date(timeTravelDate);
    const driverDate = driver.data_previsao_disponibilidade ? new Date(driver.data_previsao_disponibilidade) : new Date(driver.date_created);

    // Se o motorista estiver livre antes ou no dia
    if (driverDate <= loadDate) {
      score += 3;
    } else {
      const diffDays = (driverDate.getTime() - loadDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 1) score += 1;
      else score -= 2; // Ta atrasado pra carga
    }

    if (score >= 5) return { label: "Sinergia Alta", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", icon: "🟢" };
    if (score >= 3) return { label: "Sinergia Média", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", icon: "🟡" };
    return { label: "Sinergia Baixa", bg: "bg-red-100", text: "text-red-800", border: "border-red-300", icon: "🔴" };
  };

  const handleSaveLocation = async () => {
    if (!originPoint || !savedLocName.trim() || !user) return;

    try {
      await directus.request(createItem('locais_salvos', {
        nome: savedLocName,
        latitude: originPoint[0],
        longitude: originPoint[1],
        icone: 'map-pin',
        usuario_id: user.id
      }));
      toast({ title: "Local Salvo!", description: "O local foi salvo com sucesso em seu registro global." });
      setIsSavingLoc(false);
      setSavedLocName("");
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível salvar o local.", variant: "destructive" });
    }
  };

  const clearFilters = () => {
    setTimeTravelDate(undefined);
    setOriginPoint(null);
    setRadiusKm([50]);
    setIsSelectingOrigin(false);
  };

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[600px] border rounded-lg bg-muted/10">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-medium">Sessão expirada ou erro de conexão.</p>
          <p className="text-sm text-muted-foreground">Por favor, recarregue a página para reconectar.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* 
        ==============================
        FILTER BAR (Top Full Width)
        ==============================
      */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <CardContent className="p-5 flex flex-col md:flex-row items-center gap-6 justify-between">

          {/* Left Group: Data & Geo */}
          <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">

            {/* 1. Viagem no Tempo (Data) */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Viagem no Tempo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-[240px] justify-start text-left font-normal ${!timeTravelDate && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {timeTravelDate ? format(timeTravelDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                  <Calendar
                    mode="single"
                    selected={timeTravelDate}
                    onSelect={setTimeTravelDate}
                    initialFocus
                    locale={ptBR}
                    disabled={(date) => false} // Allow future dates for prediction
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Divisor */}
            <div className="hidden md:block w-px h-10 bg-slate-200 dark:bg-slate-700" />

            {/* 2. Ponto de Origem */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ponto de Busca (Mapa)</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant={isSelectingOrigin ? "default" : (originPoint ? "secondary" : "outline")}
                  onClick={() => setIsSelectingOrigin(!isSelectingOrigin)}
                  className="w-[200px]"
                >
                  {isSelectingOrigin ? (
                    <>
                      <Crosshair className="animate-pulse mr-2 h-4 w-4" />
                      Clique no mapa...
                    </>
                  ) : originPoint ? (
                    <>
                      <MapPin className="mr-2 h-4 w-4 text-emerald-600" />
                      Ponto Selecionado
                    </>
                  ) : (
                    <>
                      <MapIcon className="mr-2 h-4 w-4" />
                      Selecionar Ponto
                    </>
                  )}
                </Button>

                {originPoint && (
                  <Dialog open={isSavingLoc} onOpenChange={setIsSavingLoc}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Salvar Ponto">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Salvar Localização</DialogTitle>
                        <DialogDescription>Dê um nome a este ponto no mapa para utilizá-lo frequentemente (ex: Centro Logístico SP).</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Nome do Local</Label>
                          <Input value={savedLocName} onChange={e => setSavedLocName(e.target.value)} placeholder="Ex: Armazém Sudeste" />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center justify-between bg-muted/50 p-3 rounded border">
                          <span>Coordenadas:</span>
                          <span className="font-mono">{originPoint[0].toFixed(5)}, {originPoint[1].toFixed(5)}</span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSavingLoc(false)}>Cancelar</Button>
                        <Button onClick={handleSaveLocation} disabled={!savedLocName.trim()}>Salvar Ponto</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* 3. Raio de Distância */}
            <div className="flex flex-col gap-2 w-[220px]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max. Distância</Label>
                <span className="text-xs font-bold text-emerald-600">{radiusKm[0]} km</span>
              </div>
              <Slider
                value={radiusKm}
                onValueChange={setRadiusKm}
                max={2000}
                min={10}
                step={10}
                className="mt-1"
              />
            </div>

          </div>

          {/* Right Group: Clear Filters */}
          {(timeTravelDate || originPoint) && (
            <Button variant="ghost" className="text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={clearFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          )}

        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Map Section */}
        <div className="lg:w-2/3">
          <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapIcon className="h-5 w-5 text-primary" />
                  Rastreamento
                  {isSelectingOrigin && <span className="text-xs font-normal text-emerald-600 animate-pulse ml-2">Modo seleção de alvo ativado</span>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {timeTravelDate && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      Visualizando Histórico
                    </Badge>
                  )}
                  <Badge className="bg-primary text-white">{drivers.length} no mapa</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative">
              {isLoading ? (
                <div className="p-8"><Skeleton className="h-[600px] w-full" /></div>
              ) : (
                <AdvancedMap
                  center={mapCenter}
                  zoom={mapZoom}
                  markers={mapMarkers}
                  circles={circles}
                  polylines={polylines}
                  onMarkerClick={handleMarkerClick}
                  onMapClick={handleMapClick}
                  enableClustering={true}
                  enableSearch={true}
                  enableControls={true}
                  style={{ height: '600px', width: '100%' }}
                />
              )}
              {isSelectingOrigin && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-zinc-900 text-white px-4 py-2 rounded-full font-medium shadow-lg animate-bounce text-sm">
                  👇 Clique em qualquer lugar no mapa
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Drivers List */}
        <div className="lg:w-1/3 space-y-4">
          <Card className="flex flex-col h-[calc(600px+63px)] border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  {originPoint ? 'Motoristas no Raio' : 'Motoristas Disponíveis'}
                </CardTitle>
                <Badge variant="outline">{allAvailableDrivers.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 overflow-y-auto grow space-y-3 bg-slate-50/30 dark:bg-slate-950/30">
              {allAvailableDrivers.map((driver: any) => {
                const hasGps = driver.latitude && driver.longitude;
                // calculate dist if origin is set to show in UI
                let distLabel = "";
                if (originPoint && hasGps) {
                  const dist = getDistanceFromLatLonInKm(originPoint[0], originPoint[1], Number(driver.latitude), Number(driver.longitude));
                  distLabel = `${Math.round(dist)} km`;
                }

                const isFuture = driver.data_previsao_disponibilidade && new Date(driver.data_previsao_disponibilidade) > new Date();
                const synergy = getSynergyScore(driver);

                return (
                  <div
                    key={driver.id}
                    className={`p-3 border rounded-xl bg-white dark:bg-slate-950 cursor-pointer transition-all ${selectedDriver?.id === driver.id
                      ? "border-primary shadow-sm"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                      } ${!hasGps ? 'opacity-60' : ''}`}
                    onClick={() => hasGps ? handleDriverSelect(driver) : null}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Truck className={`h-4 w-4 ${selectedDriver?.id === driver.id ? 'text-primary' : 'text-slate-400'}`} />
                        <span className="font-bold text-sm text-foreground">
                          {driver.motorista_id?.nome} {driver.motorista_id?.sobrenome}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {synergy && (
                          <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 ${synergy.bg} ${synergy.text} ${synergy.border}`}>
                            {synergy.icon} {synergy.label}
                          </Badge>
                        )}
                        {isFuture && (
                          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 border-indigo-200">
                            Previsão
                          </Badge>
                        )}
                        {!hasGps && (
                          <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 uppercase tracking-wider">Sem GPS</Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-2 mt-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                        <div className="flex flex-col">
                          <p className="line-clamp-2 leading-relaxed">
                            {driver.localizacao_atual || 'Local desconhecido'}
                          </p>
                          {isFuture && driver.local_disponibilidade && (
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 flex items-center gap-1">
                              ↳ Estará em: {driver.local_disponibilidade}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 font-medium text-[10px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          {new Date(driver.date_updated || driver.date_created).toLocaleString()}
                        </div>
                        {distLabel && (
                          <div className="font-bold text-primary flex items-center gap-1">
                            <Crosshair className="h-3 w-3" />
                            {distLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {allAvailableDrivers.length === 0 && (
                <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <XCircle className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">Nenhum veículo encontrado</p>
                  <p className="text-xs mt-1 text-slate-500">Ajuste os filtros de data ou aumente o raio de busca para encontrar veículos.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};