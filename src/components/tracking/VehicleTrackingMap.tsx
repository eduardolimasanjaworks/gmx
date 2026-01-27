import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock } from "lucide-react";
import { AdvancedMap } from "@/components/ui/interactive-map";

const mockShipments = [
  {
    id: "1",
    driver: "João Silva",
    vehicle: "ABC-1234",
    origin: "São Paulo, SP",
    destination: "Rio de Janeiro, RJ",
    status: "in_transit",
    location: { lat: -23.5505, lng: -46.6333 },
    deliveryWindow: {
      start: "14:00",
      end: "18:00",
    },
  },
  {
    id: "2",
    driver: "Maria Santos",
    vehicle: "DEF-5678",
    origin: "Belo Horizonte, MG",
    destination: "Brasília, DF",
    status: "pending",
    location: { lat: -19.9167, lng: -43.9345 },
    deliveryWindow: {
      start: "10:00",
      end: "14:00",
    },
  },
  {
    id: "3",
    driver: "Carlos Oliveira",
    vehicle: "GHI-9012",
    origin: "Salvador, BA",
    destination: "Recife, PE",
    status: "delivered",
    location: { lat: -12.9714, lng: -38.5014 },
    deliveryWindow: {
      start: "08:00",
      end: "12:00",
    },
  },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  in_transit: { label: "Em Trânsito", color: "blue" },
  pending: { label: "Pendente", color: "orange" },
  delivered: { label: "Entregue", color: "green" },
};

export const VehicleTrackingMap = () => {
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const markers = mockShipments.map(shipment => {
    const colorMap: Record<string, string> = {
      in_transit: 'blue',
      pending: 'orange',
      delivered: 'green',
    };

    return {
      id: shipment.id,
      position: [shipment.location.lat, shipment.location.lng] as [number, number],
      color: colorMap[shipment.status] || 'grey',
      size: 'medium',
      popup: {
        title: `${shipment.driver} - ${shipment.vehicle}`,
        content: `${shipment.origin} → ${shipment.destination}\nStatus: ${statusConfig[shipment.status].label}`,
      },
    };
  });

  const handleMarkerClick = (marker: any) => {
    const shipment = mockShipments.find(s => s.id === marker.id);
    setSelectedShipment(shipment);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* Map Section */}
      <div className="lg:w-2/3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Rastreamento de Veículos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedMap 
              center={[-15.7801, -47.9292]}
              zoom={5}
              markers={markers}
              onMarkerClick={handleMarkerClick}
              enableClustering={true}
              enableSearch={true}
              enableControls={true}
              style={{ height: '600px', width: '100%' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Shipments List */}
      <div className="lg:w-1/3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Embarques Ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockShipments.map((shipment) => (
              <div
                key={shipment.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedShipment?.id === shipment.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedShipment(shipment)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{shipment.driver}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                  >
                    {statusConfig[shipment.status].label}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <p className="truncate">
                      {shipment.origin} → {shipment.destination}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Janela: {shipment.deliveryWindow.start} - {shipment.deliveryWindow.end}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {selectedShipment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes do Embarque</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Motorista</p>
                <p className="font-medium">{selectedShipment.driver}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Veículo</p>
                <p className="font-medium">{selectedShipment.vehicle}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="secondary">
                  {statusConfig[selectedShipment.status].label}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Rota</p>
                <p className="font-medium">
                  {selectedShipment.origin} → {selectedShipment.destination}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Janela de Entrega</p>
                <p className="font-medium">
                  {selectedShipment.deliveryWindow.start} - {selectedShipment.deliveryWindow.end}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Localização Atual</p>
                <p className="font-medium text-xs">
                  Lat: {selectedShipment.location.lat.toFixed(4)}, 
                  Lng: {selectedShipment.location.lng.toFixed(4)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};