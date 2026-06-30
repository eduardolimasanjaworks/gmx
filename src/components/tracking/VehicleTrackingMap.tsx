import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CalendarIcon, Map as MapIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdvancedMap } from '@/components/ui/interactive-map';
import { ContatoProativoPanelV2 } from '@/features/contato-proativo/ContatoProativoPanelV2';
import { coordenadasMotorista, coordenadasPorLocal } from './tracking-geo-utils';
import { TrackingDriversList } from './TrackingDriversList';
import { TrackingFiltersBar } from './TrackingFiltersBar';
import { useVehicleTrackingState } from './useVehicleTrackingState';


export const VehicleTrackingMap = () => {
  const {
    selectedDriver, setSelectedDriver,
    mapCenter, setMapCenter,
    mapZoom, setMapZoom,
    timeTravelDate, setTimeTravelDate,
    timeTravelEndDate, setTimeTravelEndDate,
    radiusKm, setRadiusKm,
    originPoint, setOriginPoint,
    showDisponivel, setShowDisponivel,
    showRetornando, setShowRetornando,
    showCarregado, setShowCarregado,
    showSomentePrevistos, setShowSomentePrevistos,
    isSearchingFactory, setIsSearchingFactory,
    factorySearchTerm, setFactorySearchTerm,
    factoryName, setFactoryName,
    isSearching,
    selectedOperations, setSelectedOperations,
    fetchedDrivers, isLoading, isError,
    allAvailableDrivers, drivers, markers,
    driverHistory,
    dataFiltroReferencia,
    handleSearchFactory,
  } = useVehicleTrackingState();

  const factoryDivIcon = L.divIcon({
    html: `<div class="relative flex items-center justify-center"><div class="absolute w-20 h-20 bg-orange-500 rounded-full animate-ping opacity-60"></div><div style="background-color:#ea580c;border-radius:50%;padding:10px;border:3px solid white;box-shadow:0 4px 12px rgba(234,88,12,0.6);display:flex;align-items:center;justify-content:center;width:56px;height:56px;position:relative;z-index:10;"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M13 18h1"/><path d="M9 18h1"/></svg></div></div>`,
    className: 'custom-factory-marker bg-transparent border-0',
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -28],
  });

  const circles = originPoint ? [{
    center: originPoint,
    radius: radiusKm[0] * 1000,
    style: { color: '#4f46e5', weight: 2, fillOpacity: 0.1 },
    popup: `Raio de busca: ${radiusKm[0]}km`,
  }] : [];

  const polylines = (() => {
    const lines: unknown[] = [];
    if (!selectedDriver) return lines;
    const d = selectedDriver as Record<string, unknown>;
    const currentCoords = coordenadasMotorista(selectedDriver, dataFiltroReferencia);
    const currentLat = Number(currentCoords?.[0]);
    const currentLng = Number(currentCoords?.[1]);
    if (driverHistory.length > 0) {
      const histPos = (driverHistory as Array<Record<string, unknown>>)
        .filter((h) => h.latitude && h.longitude)
        .map((h) => [Number(h.latitude), Number(h.longitude)] as [number, number]);
      if (histPos.length > 0) {
        histPos.push([currentLat, currentLng]);
        lines.push({ positions: histPos, style: { color: '#6366f1', weight: 4, dashArray: '5, 10' }, popup: 'Histórico de Trajetória' });
      }
    }
    if (originPoint && currentLat && currentLng) {
      lines.push({ positions: [[currentLat, currentLng], originPoint], style: { color: '#10b981', weight: 4, dashArray: '8, 8' }, popup: 'Trajetória até a Origem da Carga' });
    }
    const localPrev = String(d?.local_liberacao_prevista || d?.local_disponibilidade || '');
    const destPrevisto = localPrev ? coordenadasPorLocal(localPrev) : null;
    if (destPrevisto && currentLat && currentLng) {
      lines.push({ positions: [[currentLat, currentLng], destPrevisto], style: { color: '#f59e0b', weight: 3, dashArray: '5, 5' }, popup: `Liberação prevista: ${localPrev}` });
    }
    return lines;
  })();

  const mapMarkers = (() => {
    const all = [...markers];
    if (selectedDriver) {
      const d = selectedDriver as Record<string, unknown>;
      const hist = driverHistory as Array<Record<string, unknown>>;
      const destCoords = (() => {
        const lp = String(d?.local_liberacao_prevista || d?.local_disponibilidade || '');
        return lp ? coordenadasPorLocal(lp) : null;
      })();
      if (destCoords) {
        all.push({ id: 'driver-dest', position: destCoords, color: 'orange', size: 'medium', popup: { title: 'Localização Prevista', content: '' } });
      }
      if (hist.length > 0 && hist[0].latitude && hist[0].longitude) {
        all.push({ id: 'driver-start', position: [Number(hist[0].latitude), Number(hist[0].longitude)], color: 'purple', size: 'small', popup: { title: 'Ponto de Partida', content: String(hist[0].date_created ?? '') } });
      }
    }
    if (originPoint) {
      all.push({ id: 'factory-origin', position: originPoint, icon: factoryDivIcon, popup: { title: 'Fábrica/Origem', content: '' } });
    }
    return all;
  })();

  const handleMarkerClick = (marker: Record<string, unknown>) => {
    const found = drivers.find((d) => (d.driver as Record<string, unknown>).id === marker.id);
    if (found) {
      setSelectedDriver(found.driver);
      setMapCenter(marker.position as [number, number]);
      setMapZoom(12);
    }
  };

  const handleDriverSelect = (driver: unknown) => {
    setSelectedDriver(driver);
    const d = driver as Record<string, unknown>;
    const coords = coordenadasMotorista(driver, dataFiltroReferencia);
    if (coords) { setMapCenter(coords); setMapZoom(12); }
    else if (d.latitude && d.longitude) { setMapCenter([Number(d.latitude), Number(d.longitude)]); setMapZoom(12); }
  };

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[600px] border rounded-lg bg-muted/10">
        <p className="text-red-500 font-medium">Sessão expirada ou erro de conexão.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Recarregar Página
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <TrackingFiltersBar
        timeTravelDate={timeTravelDate}
        timeTravelEndDate={timeTravelEndDate}
        onTimeTravelDate={setTimeTravelDate}
        onTimeTravelEndDate={setTimeTravelEndDate}
        selectedOperations={selectedOperations}
        onOperations={setSelectedOperations}
        showDisponivel={showDisponivel}
        showRetornando={showRetornando}
        showCarregado={showCarregado}
        showSomentePrevistos={showSomentePrevistos}
        onShowDisponivel={setShowDisponivel}
        onShowRetornando={setShowRetornando}
        onShowCarregado={setShowCarregado}
        onShowSomentePrevistos={setShowSomentePrevistos}
        originPoint={originPoint}
        isSearchingFactory={isSearchingFactory}
        onSearchingFactory={setIsSearchingFactory}
        factoryName={factoryName}
        onFactoryName={setFactoryName}
        factorySearchTerm={factorySearchTerm}
        onFactorySearchTerm={setFactorySearchTerm}
        isSearching={isSearching}
        onSearchFactory={handleSearchFactory}
        radiusKm={radiusKm}
        onRadiusKm={setRadiusKm}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3">
          <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapIcon className="h-5 w-5 text-primary" />
                  Rastreamento
                </CardTitle>
                <div className="flex items-center gap-2">
                  {(timeTravelDate || timeTravelEndDate) && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      Visualizando Histórico
                    </Badge>
                  )}
                  <Badge variant="outline" className="hidden sm:inline-flex">{fetchedDrivers.length} registros</Badge>
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
                  markers={mapMarkers as Parameters<typeof AdvancedMap>[0]['markers']}
                  circles={circles}
                  polylines={polylines as Parameters<typeof AdvancedMap>[0]['polylines']}
                  onMarkerClick={handleMarkerClick as Parameters<typeof AdvancedMap>[0]['onMarkerClick']}
                  onMapClick={() => undefined}
                  enableClustering={true}
                  enableSearch={false}
                  enableControls={true}
                  style={{ height: '600px', width: '100%' }}
                />
              )}
            </CardContent>
          </Card>
          <ContatoProativoPanelV2 className="mt-6" />
        </div>

        <div className="lg:w-1/3 space-y-4">
          <TrackingDriversList
            allAvailableDrivers={allAvailableDrivers}
            selectedDriver={selectedDriver}
            originPoint={originPoint}
            timeTravelDate={timeTravelDate}
            dataFiltroReferencia={dataFiltroReferencia}
            onDriverSelect={handleDriverSelect}
          />
        </div>
      </div>
    </div>
  );
};
