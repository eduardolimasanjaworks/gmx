import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock } from "lucide-react";
import { AdvancedMap } from "@/components/ui/interactive-map";
import { useQuery } from "@tanstack/react-query";
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";


export const VehicleTrackingMap = () => {
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.7801, -47.9292]);
  const [mapZoom, setMapZoom] = useState<number>(4);

  const { refreshToken } = useAuth();

  const fetchDrivers = async () => {
    const response = await directus.request(readItems('disponivel', {
      filter: {
        disponivel: { _eq: true },
        status: { _eq: 'published' }
      },
      fields: ['*', 'motorista_id.*'],
    }));
    return response.filter((d: any) =>
      d.latitude && d.longitude &&
      !isNaN(Number(d.latitude)) && !isNaN(Number(d.longitude))
    );
  };

  const { data: drivers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['tracking-map-drivers'],
    queryFn: async () => {
      try {
        return await fetchDrivers();
      } catch (error: any) {
        // If token expired, try to refresh and retry once
        if (error?.response?.status === 401 || error?.message === "Token expired.") {
          try {
            await refreshToken();
            return await fetchDrivers();
          } catch (refreshError) {
            throw refreshError;
          }
        }
        console.error("Error fetching tracking data:", error);
        return [];
      }
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const markers = drivers.map((d: any) => ({
    id: d.id,
    position: [Number(d.latitude), Number(d.longitude)] as [number, number],
    color: 'blue', // Default to blue for available
    size: 'medium',
    popup: {
      title: `${d.motorista_id?.nome || 'Motorista'} ${d.motorista_id?.sobrenome || ''}`,
      content: `${d.localizacao_atual || 'Localização não informada'}\nVeículo: ${d.motorista_id?.tipo_veiculo || 'N/A'}`,
      image: d.motorista_id?.foto ? `http://91.99.137.101:8057/assets/${d.motorista_id.foto}` : undefined
    },
    driverData: d // Attach full data for click handling
  }));

  const handleMarkerClick = (marker: any) => {
    // Find the driver data associated with this marker
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

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[600px] w-full" /></div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* Map Section */}
      <div className="lg:w-2/3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Rastreamento de Veículos ({drivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drivers.length > 0 ? (
              <AdvancedMap
                center={mapCenter}
                zoom={mapZoom}
                markers={markers}
                onMarkerClick={handleMarkerClick}
                enableClustering={true}
                enableSearch={true}
                enableControls={true}
                style={{ height: '600px', width: '100%' }}
              />
            ) : (
              <div className="h-[600px] flex items-center justify-center bg-muted/20 border rounded-lg">
                <p className="text-muted-foreground">Nenhum motorista com localização disponível no momento.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drivers List */}
      <div className="lg:w-1/3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Veículos no Mapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {drivers.map((driver: any) => (
              <div
                key={driver.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedDriver?.id === driver.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
                  }`}
                onClick={() => handleDriverSelect(driver)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {driver.motorista_id?.nome} {driver.motorista_id?.sobrenome}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Disponível
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <p className="truncate">
                      {driver.localizacao_atual || 'Local desconhecido'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Atualizado: {new Date(driver.date_updated || driver.date_created).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {drivers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum veículo rastreável.
              </p>
            )}
          </CardContent>
        </Card>

        {selectedDriver && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes do Veículo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Motorista</p>
                <p className="font-medium">{selectedDriver.motorista_id?.nome} {selectedDriver.motorista_id?.sobrenome}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Veículo</p>
                <p className="font-medium">{selectedDriver.motorista_id?.tipo_veiculo || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Placa</p>
                <p className="font-medium font-mono">{selectedDriver.motorista_id?.placa || '---'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Localização</p>
                <p className="font-medium">
                  {selectedDriver.localizacao_atual}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lat: {selectedDriver.latitude}, Lng: {selectedDriver.longitude}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};