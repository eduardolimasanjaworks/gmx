import { useEffect } from 'react';
import { AdvancedMap } from '@/components/ui/interactive-map';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarkerData, PolylineData } from '@/components/ui/interactive-map';

interface DriverWithJourney {
  id: string;
  name: string;
  truck_plate: string;
  availability_status: string;
  current_location: string | null;
  vehicle_journeys: Array<{
    id: string;
    current_status: string;
    estimated_arrival: string | null;
  }>;
}

interface ActiveEmbarque {
  id: string;
  origin: string;
  destination: string;
  status: string;
  driver_id: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
}

export function RealTimeMap() {
  const queryClient = useQueryClient();

  // Buscar APENAS motoristas que TÊM vehicle_journeys ativos (em trânsito, carregando, descarregando)
  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['active-drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*, vehicle_journeys!inner(*)')
        .not('current_location', 'is', null)
        .in('vehicle_journeys.current_status', ['loading', 'in_transit', 'unloading']);

      if (error) throw error;
      return (data || []) as DriverWithJourney[];
    },
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  // Buscar embarques ativos para desenhar rotas (incluindo in_transit e new)
  const { data: activeRoutes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: ['active-routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('embarques')
        .select('*')
        .in('status', ['in_transit', 'in_progress', 'loading', 'dispatched', 'new']);

      if (error) throw error;
      return (data || []) as ActiveEmbarque[];
    },
    refetchInterval: 30000,
  });

  // Subscription para atualizações em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('real-time-tracking')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'cadastro_motorista',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['active-drivers'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'embarques',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['active-routes'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicle_journeys',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['active-drivers'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Converter drivers para markers (CORRIGIDO: usando markers, não drivers)
  const markers: MarkerData[] = drivers
    .filter(d => d.current_location)
    .map(driver => {
      // Parse current_location se for string "lat,lng" ou "cidade, estado"
      let lat = -15.7801; // Centro do Brasil (fallback)
      let lng = -47.9292;

      if (driver.current_location) {
        const parts = driver.current_location.split(',').map(s => s.trim());
        const parsedLat = parseFloat(parts[0]);
        const parsedLng = parseFloat(parts[1]);

        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          lat = parsedLat;
          lng = parsedLng;
        }
      }

      const journey = driver.vehicle_journeys[0];
      let journeyInfo = '';

      if (journey) {
        journeyInfo = `\nStatus: ${journey.current_status}`;
        if (journey.estimated_arrival) {
          const eta = new Date(journey.estimated_arrival);
          journeyInfo += `\nETA: ${eta.toLocaleDateString()} ${eta.toLocaleTimeString()}`;
        }
      }

      return {
        id: driver.id,
        position: [lat, lng] as [number, number],
        color: driver.availability_status === 'busy' ? 'red' : 'green',
        size: 'large' as const,
        popup: {
          title: driver.name,
          content: `Placa: ${driver.truck_plate}\nStatus: ${driver.availability_status}${journeyInfo}`,
        },
      };
    });

  // Converter embarques para polylines (CORRIGIDO: usando polylines, não polygons)
  const polylines: PolylineData[] = activeRoutes
    .filter(embarque => {
      // Só desenhar rota se tiver coordenadas ou posição atual
      return embarque.current_latitude !== null || embarque.origin;
    })
    .map(embarque => {
      // Coordenadas aproximadas de algumas capitais brasileiras (fallback)
      const cityCoords: Record<string, [number, number]> = {
        'São Paulo': [-23.5505, -46.6333],
        'Rio de Janeiro': [-22.9068, -43.1729],
        'Brasília': [-15.7801, -47.9292],
        'Belo Horizonte': [-19.9167, -43.9345],
        'Curitiba': [-25.4284, -49.2733],
        'Porto Alegre': [-30.0346, -51.2177],
        'Salvador': [-12.9714, -38.5014],
        'Recife': [-8.0476, -34.8770],
        'Fortaleza': [-3.7172, -38.5433],
      };

      // Tentar encontrar coordenadas da origem
      let originCoords: [number, number] = [-15.7801, -47.9292]; // Centro do Brasil
      const originCity = Object.keys(cityCoords).find(city =>
        embarque.origin.toLowerCase().includes(city.toLowerCase())
      );
      if (originCity) {
        originCoords = cityCoords[originCity];
      }

      // Tentar encontrar coordenadas do destino
      let destCoords: [number, number] = [-15.7801, -47.9292];
      const destCity = Object.keys(cityCoords).find(city =>
        embarque.destination?.toLowerCase().includes(city.toLowerCase())
      );
      if (destCity) {
        destCoords = cityCoords[destCity];
      }

      // Se tiver posição atual do embarque, usar como ponto intermediário
      const positions: [number, number][] = [originCoords];

      if (embarque.current_latitude && embarque.current_longitude) {
        positions.push([embarque.current_latitude, embarque.current_longitude]);
      }

      if (embarque.destination) {
        positions.push(destCoords);
      }

      const statusColors: Record<string, string> = {
        'in_progress': 'blue',
        'loading': 'orange',
        'dispatched': 'purple',
      };

      return {
        id: embarque.id,
        positions,
        style: {
          color: statusColors[embarque.status] || 'gray',
          weight: 3,
        },
        popup: `${embarque.origin} → ${embarque.destination || 'Destino não definido'}`,
      };
    });

  if (loadingDrivers || loadingRoutes) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted/30 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando mapa em tempo real...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-[1000] bg-background/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border">
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>{drivers.length} motoristas ativos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>{activeRoutes.length} rotas ativas</span>
          </div>
        </div>
      </div>

      <AdvancedMap
        center={[-15.7801, -47.9292]}
        zoom={5}
        markers={markers}
        polylines={polylines}
        polygons={[]}
        enableClustering={true}
        enableSearch={true}
        enableControls={true}
        style={{ height: '600px', width: '100%' }}
      />
    </div>
  );
}
