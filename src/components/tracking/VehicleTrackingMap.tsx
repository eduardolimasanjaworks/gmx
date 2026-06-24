import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock, CalendarIcon, Crosshair, Map as MapIcon, RotateCcw, XCircle, Factory, Search, MoreVertical, Edit2, Trash2, Check, X } from "lucide-react";
import { AdvancedMap } from "@/components/ui/interactive-map";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { directus } from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import { Skeleton } from "@/components/ui/skeleton";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { OperationsFilter } from "@/components/operations/OperationsFilter";
import { fetchAddressByCep } from "@/lib/cepLookup";
import { ContatoProativoPanel } from "@/components/dashboard/ContatoProativoPanel";

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

const CITY_COORDS: Record<string, [number, number]> = {
  'GUARULHOS_SP': [-23.4543, -46.5337],
  'CAMPINAS_SP': [-22.9099, -47.0626],
  'SAO PAULO_SP': [-23.5505, -46.6333],
  'RIO DE JANEIRO_RJ': [-22.9068, -43.1729],
  'BELO HORIZONTE_MG': [-19.9167, -43.9345],
  'CURITIBA_PR': [-25.4284, -49.2733],
  'PORTO ALEGRE_RS': [-30.0346, -51.2177],
  'GOIANIA_GO': [-16.6869, -49.2648],
  'BRASILIA_DF': [-15.7939, -47.8828],
  'SALVADOR_BA': [-12.9777, -38.5016],
  'RECIFE_PE': [-8.0578, -34.8829],
  'FORTALEZA_CE': [-3.7319, -38.5267],
};

function normalizarLocalChave(local: string): string | null {
  const t = String(local || '').replace(/\s+/g, ' ').trim().toUpperCase();
  const m = t.match(/^(.*?)[,/\- ]\s*([A-Z]{2})$/);
  if (!m) return null;
  return `${m[1].trim()}_${m[2].trim()}`;
}

function coordenadasPorLocal(local?: string | null): [number, number] | null {
  const chave = local ? normalizarLocalChave(local) : null;
  return chave ? CITY_COORDS[chave] || null : null;
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
    urlDate ? new Date(urlDate) : new Date()
  );
  const [timeTravelEndDate, setTimeTravelEndDate] = useState<Date | undefined>(
    urlDate ? new Date(urlDate) : new Date()
  );
  const [radiusKm, setRadiusKm] = useState<number[]>([150]); // Default slightly larger for loads
  const [originPoint, setOriginPoint] = useState<[number, number] | null>(
    urlLat && urlLng ? [Number(urlLat), Number(urlLng)] : null
  );
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);
  const [showDisponivel, setShowDisponivel] = useState(true);
  const [showRetornando, setShowRetornando] = useState(true);
  const [showCarregado, setShowCarregado] = useState(true);
  const [showSomentePrevistos, setShowSomentePrevistos] = useState(false);

  // Busca de Fábrica/Empresa
  const [isSearchingFactory, setIsSearchingFactory] = useState(false);
  const [factorySearchTerm, setFactorySearchTerm] = useState("");
  const [factoryName, setFactoryName] = useState(""); // Nome personalizado da empresa
  const [savedFactoryName, setSavedFactoryName] = useState("Sua Fábrica/Empresa"); // Nome aplicado ao mapa
  const [isSearching, setIsSearching] = useState(false);

  // Dropdown Custom e Salvar Rapido
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tempFactory, setTempFactory] = useState<any>(null);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  
  // Edit Location
  const [isEditingLoc, setIsEditingLoc] = useState(false);
  const [editingLocId, setEditingLocId] = useState<string | number | null>(null);
  const [editingLocName, setEditingLocName] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { refreshToken, user } = useAuth();

  const normalizarOperacao = (value: unknown): string => String(value ?? '').trim().toUpperCase();

  const statusNormalizado = (driver: any): string => String(driver?.status || '').trim().toLowerCase();

  const dataFiltroReferencia = timeTravelDate ? new Date(timeTravelDate) : null;
  if (dataFiltroReferencia) dataFiltroReferencia.setHours(23, 59, 59, 999);

  const usarPosicaoPrevista = (driver: any): boolean => {
    if (!driver?.data_previsao_disponibilidade || !driver?.local_disponibilidade || !dataFiltroReferencia) return false;
    const previsao = new Date(driver.data_previsao_disponibilidade);
    return !Number.isNaN(previsao.getTime()) && previsao <= dataFiltroReferencia;
  };

  const coordenadasMotorista = (driver: any): [number, number] | null => {
    if (usarPosicaoPrevista(driver)) {
      const prev = coordenadasPorLocal(driver.local_disponibilidade);
      if (prev) return prev;
    }
    const lat = Number(driver?.latitude);
    const lng = Number(driver?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    const atual = coordenadasPorLocal(driver?.localizacao_atual);
    if (atual) return atual;
    return coordenadasPorLocal(driver?.local_disponibilidade);
  };

  const corStatus = (driver: any): string => {
    const st = statusNormalizado(driver);
    if (st === 'carregado') return 'slate';
    if (st === 'retornando') return 'amber';
    return usarPosicaoPrevista(driver) ? 'indigo' : 'green';
  };

  const extrairOperacoesDriver = (driver: any): string[] => {
    const fontes = [
      driver?.operacao,
      driver?.tipo_operacao,
      driver?.motorista_id?.operacao,
      driver?.motorista_id?.tipo_operacao,
      driver?.motorista_id?.tipo_rota,
      driver?.motorista_id?.produto_predominante,
    ]
      .filter(Boolean)
      .flatMap((item) => String(item).split(/[;,/|]/g))
      .map(normalizarOperacao)
      .filter(Boolean);
    return Array.from(new Set(fontes));
  };

  const fetchDrivers = async () => {
    let filterQuery: any = undefined;

    if (timeTravelDate || timeTravelEndDate) {
      const startOfDay = new Date(timeTravelDate || new Date());
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(timeTravelEndDate || timeTravelDate || new Date());
      endOfDay.setHours(23, 59, 59, 999);

      filterQuery = {
        date_created: {
          _gte: startOfDay.toISOString(),
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
      .filter((item: any) => {
        const st = statusNormalizado(item);
        const elegivelStatus =
          item.disponivel === true || st === 'disponivel' || st === 'retornando' || st === 'carregado';
        if (!elegivelStatus) return false;

        // Quando "Viagem no Tempo" está ativa, aplicar regra temporal:
        if (timeTravelDate) {
          const endOfSelectedDay = new Date(timeTravelDate);
          endOfSelectedDay.setHours(23, 59, 59, 999);

          if (item.data_previsao_disponibilidade) {
            const previsao = new Date(item.data_previsao_disponibilidade);
            return previsao <= endOfSelectedDay;
          }
          const criado = new Date(item.date_created);
          return criado <= endOfSelectedDay;
        }
        return true;
      });
  };

  const { data: fetchedDrivers = [], isLoading, isError } = useQuery({
    queryKey: ['tracking-map-drivers', timeTravelDate?.toISOString(), timeTravelEndDate?.toISOString()],
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

    filtered = filtered.filter((d: any) => {
      const st = statusNormalizado(d);
      if (st === 'carregado') return showCarregado;
      if (st === 'retornando') return showRetornando;
      return showDisponivel;
    });

    if (selectedOperations.length > 0) {
      const filtro = new Set(selectedOperations.map(normalizarOperacao));
      filtered = filtered.filter((d: any) => {
        const operacoes = extrairOperacoesDriver(d);
        return operacoes.some((op) => filtro.has(op));
      });
    }

    if (showSomentePrevistos) {
      filtered = filtered.filter((d: any) => Boolean(d.local_disponibilidade) && Boolean(d.data_previsao_disponibilidade));
    }

    if (originPoint) {
      const MAX_KM = radiusKm[0];
      filtered = filtered.filter((d: any) => {
        const coords = coordenadasMotorista(d);
        if (!coords) return false;
        const dist = getDistanceFromLatLonInKm(
          originPoint[0], originPoint[1],
          coords[0], coords[1]
        );
        return dist <= MAX_KM;
      });
    }

    return filtered;
  }, [fetchedDrivers, originPoint, radiusKm, selectedOperations, showCarregado, showDisponivel, showRetornando, showSomentePrevistos]);

  // Apenas os motoristas com coordenadas GPS vão para o mapa
  const drivers = allAvailableDrivers
    .map((d: any) => ({ driver: d, coords: coordenadasMotorista(d) }))
    .filter((item) => Boolean(item.coords));

  const markers = drivers.map(({ driver: d, coords }) => ({
    id: d.id,
    position: coords as [number, number],
    color: corStatus(d),
    size: 'medium',
    popup: {
      title: `${d.motorista_id?.nome || 'Motorista'} ${d.motorista_id?.sobrenome || ''}`,
      content: `${d.localizacao_atual || 'Localização não informada'}\nStatus: ${String(d.status || 'disponivel')}${usarPosicaoPrevista(d) && d.local_disponibilidade ? `\nPosição prevista: ${d.local_disponibilidade}` : ''}`,
      image: d.motorista_id?.foto ? `https://gmx.sanjaworks.com/api/assets/${d.motorista_id.foto}` : undefined
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

  // Fábrica Custom Marker (DivIcon com Lucide/SVG) e animação de Pulse
  const factoryIconSvg = `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-20 h-20 bg-orange-500 rounded-full animate-ping opacity-60"></div>
      <div style="background-color: #ea580c; border-radius: 50%; padding: 10px; border: 3px solid white; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.6); display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; position: relative; z-index: 10;">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M13 18h1"/><path d="M9 18h1"/></svg>
      </div>
    </div>
  `;
  const factoryDivIcon = L.divIcon({
    html: factoryIconSvg,
    className: 'custom-factory-marker bg-transparent border-0',
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -28]
  });

  // Ícone normal para as fábricas secundárias (não-ativas)
  const normalFactoryIconSvg = `
    <div class="relative flex items-center justify-center">
      <div style="background-color: #f97316; border-radius: 50%; padding: 6px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; position: relative; z-index: 5;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M13 18h1"/><path d="M9 18h1"/></svg>
      </div>
    </div>
  `;
  const normalFactoryDivIcon = L.divIcon({
    html: normalFactoryIconSvg,
    className: 'custom-factory-marker bg-transparent border-0',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

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

  const { data: savedLocations = [], isLoading: isLoadingLocs } = useQuery({
    queryKey: ['saved-locations', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const results = await directus.request(readItems('locais_salvos', {
          filter: { user_created: { _eq: user.id } },
          sort: ['-date_created']
        }));
        return results;
      } catch (err: any) {
        // #region debug-point D:locais-salvos-read-error
        fetch('http://127.0.0.1:7777/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'gmx-iagmx-integration', runId: 'pre-fix', hypothesisId: 'D', location: 'gmx/src/components/tracking/VehicleTrackingMap.tsx:savedLocations', msg: '[DEBUG] Directus negou leitura de locais_salvos', data: { userId: user?.id ?? null, error: err?.message ?? String(err), errors: err?.errors ?? null }, ts: Date.now() }) }).catch(() => {});
        // #endregion
        console.error("Directus Erro Locais (read):", err, err.errors);
        return [];
      }
    }
  });

  const polylines = useMemo(() => {
    const lines: any[] = [];
    if (!selectedDriver) return lines;

    const currentCoords = coordenadasMotorista(selectedDriver);
    const currentLat = Number(currentCoords?.[0]);
    const currentLng = Number(currentCoords?.[1]);

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
    const destinoPrevisto = coordenadasPorLocal(selectedDriver.local_disponibilidade);
    if (destinoPrevisto && currentLat && currentLng) {
      lines.push({
        positions: [[currentLat, currentLng], destinoPrevisto],
        style: { color: '#f59e0b', weight: 3, dashArray: '5, 5' },
        popup: `Previsão declarada: ${selectedDriver.local_disponibilidade || 'Destino relatado'}`
      });
    }

    return lines;
  }, [selectedDriver, driverHistory, originPoint]);

  // Merge Custom markers for Future and History destinations of the Selected Driver
  const mapMarkers = useMemo(() => {
    const defaultMarkers: any[] = [...markers];

    if (selectedDriver) {
      const currentCoords = coordenadasMotorista(selectedDriver);
      const currentLat = Number(currentCoords?.[0]);
      const currentLng = Number(currentCoords?.[1]);

      const destinoPrevisto = coordenadasPorLocal(selectedDriver.local_disponibilidade);
      if (destinoPrevisto) {
        defaultMarkers.push({
          id: 'driver-dest',
          position: destinoPrevisto,
          color: 'orange',
          size: 'medium',
          popup: {
            title: 'Localização Prevista',
            content: `${selectedDriver.local_disponibilidade || 'Destino relatado'}${selectedDriver.data_previsao_disponibilidade ? `\nPrevisto para: ${new Date(selectedDriver.data_previsao_disponibilidade).toLocaleString()}` : ''}`,
            image: undefined
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
              content: new Date(firstP.date_created).toLocaleString(),
              image: undefined
            }
          });
        }
      }
    }

    if (originPoint) {
      defaultMarkers.push({
        id: 'factory-origin',
        position: originPoint,
        icon: factoryDivIcon,
        popup: {
          title: savedFactoryName,
          content: 'Ponto fixo definido e salvo no mapa.',
          image: undefined
        }
      });
    }

    if (showAllLocations && savedLocations && savedLocations.length > 0) {
      savedLocations.forEach((loc: any) => {
        const lat = Number(loc.latitude);
        const lng = Number(loc.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          // Não renderizamos de novo a fábrica se ela já é a fábrica principal sendo focada (originPoint)
          if (!originPoint || originPoint[0] !== lat || originPoint[1] !== lng) {
            defaultMarkers.push({
              id: `saved-loc-${loc.id}`,
              position: [lat, lng],
              icon: normalFactoryDivIcon,
              popup: {
                title: loc.nome,
                content: 'Fábrica Cadastrada (Clique no Menu para focar)',
                image: undefined
              }
            });
          }
        }
      });
    }

    return defaultMarkers;
  }, [markers, selectedDriver, driverHistory, originPoint, savedFactoryName, showAllLocations, savedLocations]);

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
    // If we want to support map clicking later
  };

  const escolherMelhorResultado = (query: string, results: any[]) => {
    const tokens = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    const numero = query.match(/\b\d{1,6}\b/)?.[0];

    const pontuar = (candidate: any) => {
      const display = String(candidate.display_name ?? '').toLowerCase();
      const address = candidate.address ?? {};
      let score = Number(candidate.importance ?? 0) * 4;

      const tokenMatches = tokens.filter((t) => display.includes(t)).length;
      score += tokenMatches * 2;

      const houseNumber = String(address.house_number ?? '');
      if (numero && houseNumber === numero) score += 8;
      else if (numero && display.includes(numero)) score += 4;

      const classType = `${candidate.class ?? ''}:${candidate.type ?? ''}`;
      if (/highway|building|house/.test(classType)) score += 2;
      if (/city|state|administrative/.test(classType)) score -= 2;
      return score;
    };

    return [...results].sort((a, b) => pontuar(b) - pontuar(a))[0];
  };

  const handleSearchFactory = async () => {
    if (!factorySearchTerm.trim()) return;
    setIsSearching(true);
    try {
      const cep = factorySearchTerm.match(/\b\d{5}-?\d{3}\b/)?.[0];
      const enderecoCep = cep ? await fetchAddressByCep(cep).catch(() => null) : null;
      const queryBase = enderecoCep
        ? `${factorySearchTerm}, ${enderecoCep.endereco}, ${enderecoCep.bairro}, ${enderecoCep.cidade} ${enderecoCep.estado}, Brasil`
        : `${factorySearchTerm}, Brasil`;

      const params = new URLSearchParams({
        format: 'jsonv2',
        addressdetails: '1',
        limit: '8',
        countrycodes: 'br',
        dedupe: '1',
        q: queryBase,
      });
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
      });
      const results = await resp.json();
      if (results && results.length > 0) {
        const melhor = escolherMelhorResultado(queryBase, results);
        const { lat, lon } = melhor;
        const newPoint: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setOriginPoint(newPoint);
        setMapCenter(newPoint);
        setMapZoom(13);
        setSavedFactoryName(factoryName.trim() || 'Sua Fábrica/Empresa');
        setIsSearchingFactory(false);
        setTempFactory({
          nome: factoryName.trim() || 'Sua Fábrica/Empresa',
          latitude: newPoint[0],
          longitude: newPoint[1]
        });
        setIsDropdownOpen(true);
        setFactorySearchTerm("");
        setFactoryName("");
      } else {
        toast({ title: "Não Encontrado", description: "Não conseguimos achar este endereço. Tente ser mais específico.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro na Busca", description: "Ocorreu um erro ao buscar o endereço.", variant: "destructive" });
    } finally {
      setIsSearching(false);
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

  const createLocationMutation = useMutation({
    mutationFn: async (factoryData: any) => {
      if (!user) throw new Error("Sem usuário logado");
      return await directus.request(createItem('locais_salvos', {
        nome: factoryData.nome,
        latitude: factoryData.latitude,
        longitude: factoryData.longitude,
        icone: 'map-pin'
      }));
    },
    onSuccess: () => {
      toast({ title: "Fábrica Salva!", description: "Fábrica confirmada e salva na conta." });
      setTempFactory(null);
      queryClient.invalidateQueries({ queryKey: ['saved-locations'] });
    },
    onError: (err: any) => {
      console.error("Directus Erro Criar Fábrica:", err, err?.errors);
      toast({ title: "Erro ao Salvar", description: err.message || "Tente novamente mais tarde.", variant: "destructive" });
    },
  });

  const handleConfirmTempFactory = () => {
    if (tempFactory) {
      createLocationMutation.mutate(tempFactory);
    }
  };

  const handleDeclineTempFactory = () => {
    setTempFactory(null);
    clearFilters();
    setIsDropdownOpen(false);
    toast({ title: "Cancelado", description: "Busca descartada sem salvar." });
  };

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, nome }: { id: string | number; nome: string }) => {
      return await directus.request(updateItem('locais_salvos', id, { nome }));
    },
    onSuccess: () => {
      toast({ title: "Atualizado", description: "O nome da Fábrica foi atualizado." });
      setIsEditingLoc(false);
      queryClient.invalidateQueries({ queryKey: ['saved-locations'] });
      // Se estamos focados nessa fábrica, re-escrevemos o título no pin
      if (editingLocName.trim()) setSavedFactoryName(editingLocName.trim());
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar o local.", variant: "destructive" }),
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return await directus.request(deleteItem('locais_salvos', id));
    },
    onSuccess: (data, id) => {
      toast({ title: "Removido", description: "Fábrica excluída da lista com sucesso." });
      queryClient.invalidateQueries({ queryKey: ['saved-locations'] });
      // Clear current focus if we deleted the highlighted origin point
      // (This requires a deeper check, but for now we won't strictly auto-clear originPoint to not disrupt viewing)
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível remover o local.", variant: "destructive" }),
  });

  const handleFocusSavedLocation = (loc: any) => {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      setOriginPoint([lat, lng]);
      setMapCenter([lat, lng]);
      setMapZoom(13);
      setSavedFactoryName(loc.nome || "Fábrica Salva");
      toast({ title: "Fábrica Selecionada", description: `Buscando motoristas perto de ${loc.nome}` });
    }
  };

  const clearFilters = () => {
    // setOriginPoint(null);
    // setRadiusKm([50]);
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
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtro no Tempo</Label>
              <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-[180px] justify-start text-left font-normal ${!timeTravelDate && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {timeTravelDate ? format(timeTravelDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Data inicial</span>}
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-[180px] justify-start text-left font-normal ${!timeTravelEndDate && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {timeTravelEndDate ? format(timeTravelEndDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Data final</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                  <Calendar
                    mode="single"
                    selected={timeTravelEndDate}
                    onSelect={setTimeTravelEndDate}
                    initialFocus
                    locale={ptBR}
                    disabled={(date) => false}
                  />
                </PopoverContent>
              </Popover>
              </div>
            </div>

            {/* Divisor */}
            <div className="hidden md:block w-px h-10 bg-slate-200 dark:bg-slate-700" />

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operações</Label>
              <OperationsFilter value={selectedOperations} onChange={setSelectedOperations} className="h-9" />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant={showDisponivel ? "secondary" : "outline"} size="sm" onClick={() => setShowDisponivel((v) => !v)}>Disponível</Button>
                <Button variant={showRetornando ? "secondary" : "outline"} size="sm" onClick={() => setShowRetornando((v) => !v)}>Retornando</Button>
                <Button variant={showCarregado ? "secondary" : "outline"} size="sm" onClick={() => setShowCarregado((v) => !v)}>Carregado</Button>
                <Button variant={showSomentePrevistos ? "secondary" : "outline"} size="sm" onClick={() => setShowSomentePrevistos((v) => !v)}>Só previstos</Button>
              </div>
            </div>

            {/* 2. Ponto de Origem */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ponto de Busca (Fábrica)</Label>
              <div className="flex items-center gap-2">
                <Dialog open={isSearchingFactory} onOpenChange={setIsSearchingFactory}>
                  <DialogTrigger asChild>
                    <Button
                      variant={originPoint ? "secondary" : "outline"}
                      className="w-[200px]"
                    >
                      {originPoint ? (
                        <>
                          <Factory className="mr-2 h-4 w-4 text-orange-600" />
                          Fábrica Definida
                        </>
                      ) : (
                        <>
                          <Factory className="mr-2 h-4 w-4" />
                          Adicionar Fábrica
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Fábrica/Empresa</DialogTitle>
                      <DialogDescription>
                        Dê um nome e informe o endereço da empresa para fixar o ponto no mapa.
                        Os motoristas no raio serão filtrados com base nesta localização.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da Fábrica / Empresa</Label>
                        <Input
                          value={factoryName}
                          onChange={(e) => setFactoryName(e.target.value)}
                          placeholder="Ex: Armazém Central - GMX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Endereço</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            value={factorySearchTerm}
                            onChange={(e) => setFactorySearchTerm(e.target.value)}
                            placeholder="Ex: Avenida Presidente Vargas, Rio de Janeiro"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchFactory()}
                          />
                          <Button type="button" onClick={handleSearchFactory} disabled={isSearching || !factorySearchTerm.trim()}>
                            {isSearching ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>


              </div>
            </div>

            {/* 3. Raio de Distância */}
            <div className="flex flex-col gap-2 w-[220px]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max. Distância</Label>
                <span className="text-xs font-bold text-emerald-600">{radiusKm[0]} km</span>
              </div>
              <Input
                type="number"
                min={10}
                            max={800}
                value={radiusKm[0]}
                onChange={(e) => {
                  const val = Number(e.target.value || 0);
                              if (!Number.isNaN(val) && val >= 10) setRadiusKm([Math.min(val, 800)]);
                }}
                className="h-8"
              />
              <Slider
                value={radiusKm}
                onValueChange={setRadiusKm}
                            max={800}
                min={10}
                step={10}
                className="mt-1"
              />
            </div>

          </div>

          {/* Right Group: Clear Filters & Saved Locations */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 md:mt-0">
            {/* 4. Dropdown de Fábricas Salvas */}
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto bg-orange-50/50 hover:bg-orange-100/80 text-orange-700 border-orange-200">
                  <Factory className="mr-2 h-4 w-4" />
                  Fábricas Cadastradas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-[300px] overflow-y-auto" onInteractOutside={() => {
                // Ao buscar nós mostramos o Dropdown forçado, mas o usuário pode clicar fora pra ignorar
                if (isDropdownOpen && !tempFactory) setIsDropdownOpen(false);
              }}>
                <DropdownMenuLabel>
                  <div className="flex items-center justify-between">
                    <span>Locais Salvos na sua Conta</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-7 px-2 text-xs transition-colors ${showAllLocations ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'text-slate-500 hover:text-orange-700'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllLocations(!showAllLocations);
                      }}
                    >
                      <MapIcon className="h-3 w-3 mr-1" />
                      {showAllLocations ? "Ocultar do Mapa" : "Mostrar Todas"}
                    </Button>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Temp Factory para confirmar Salvamento Rapido */}
                {tempFactory && (
                  <div className="flex flex-col p-2 mb-2 bg-amber-50 rounded-md border border-amber-200">
                    <span className="text-xs font-bold text-amber-800 uppercase mb-1">Confirmar Cadastro?</span>
                    <div className="flex items-center justify-between">
                      <span className="flex-1 text-sm font-semibold truncate text-amber-900 pr-2">
                        {tempFactory.nome}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 bg-emerald-100 text-emerald-700 hover:bg-emerald-200" onClick={handleConfirmTempFactory}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 bg-red-100 text-red-700 hover:bg-red-200" onClick={handleDeclineTempFactory}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isLoadingLocs && <div className="p-4 text-center text-sm text-slate-500">Carregando...</div>}
                {!isLoadingLocs && savedLocations.length === 0 && !tempFactory && (
                  <div className="p-4 text-center text-sm text-slate-500">Nenhuma fábrica cadastrada ainda.</div>
                )}
                {savedLocations.map((loc: any) => (
                  <div key={loc.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md group">
                    <button 
                      className="flex-1 text-left text-sm font-medium pr-2 truncate"
                      onClick={() => handleFocusSavedLocation(loc)}
                    >
                      {loc.nome}
                    </button>
                    {/* Botões Secundários */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-60 group-hover:opacity-100">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingLocId(loc.id);
                          setEditingLocName(loc.nome);
                          setIsEditingLoc(true);
                        }}>
                          <Edit2 className="mr-2 h-4 w-4" /> Editar Nome
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 focus:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Certeza que deseja remover esta fábrica?")) {
                              deleteLocationMutation.mutate(loc.id);
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir Fábrica
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </CardContent>
      </Card>

      {/* Editor Modal para o Nome da Fábrica */}
      <Dialog open={isEditingLoc} onOpenChange={setIsEditingLoc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome da Fábrica</DialogTitle>
            <DialogDescription>Alterar o nome atribuído a este local nas opções salvas.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Novo Nome</Label>
            <Input 
              value={editingLocName} 
              onChange={e => setEditingLocName(e.target.value)}
              onKeyDown={e => {
                if(e.key === 'Enter' && editingLocName) {
                  updateLocationMutation.mutate({ id: editingLocId as string, nome: editingLocName.trim() });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingLoc(false)}>Cancelar</Button>
            <Button 
              onClick={() => updateLocationMutation.mutate({ id: editingLocId as string, nome: editingLocName.trim() })}
              disabled={!editingLocName.trim() || updateLocationMutation.isPending}
            >
              <Check className="w-4 h-4 mr-2" /> Salvar Modificações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  enableSearch={false}
                  enableControls={true}
                  style={{ height: '600px', width: '100%' }}
                />
              )}
            </CardContent>
          </Card>
          <ContatoProativoPanel className="mt-6" />
        </div>

        {/* Drivers List */}
        <div className="lg:w-1/3 space-y-4">
          <Card className="flex flex-col h-[calc(600px+63px)] border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  {originPoint ? 'Motoristas no Raio' : 'Motoristas no Mapa'}
                </CardTitle>
                <Badge variant="outline">{allAvailableDrivers.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 overflow-y-auto grow space-y-3 bg-slate-50/30 dark:bg-slate-950/30">
              {allAvailableDrivers.map((driver: any) => {
                const hasGps = Boolean(coordenadasMotorista(driver));
                const operacoes = extrairOperacoesDriver(driver);
                const status = statusNormalizado(driver);
                // calculate dist if origin is set to show in UI
                let distLabel = "";
                if (originPoint && hasGps) {
                  const coords = coordenadasMotorista(driver);
                  const dist = coords ? getDistanceFromLatLonInKm(originPoint[0], originPoint[1], coords[0], coords[1]) : 0;
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
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                          {status || 'disponivel'}
                        </Badge>
                        {!hasGps && (
                          <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 uppercase tracking-wider">Sem GPS preciso</Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-2 mt-3">
                      {operacoes.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            {operacoes.slice(0, 2).join(' · ')}
                          </Badge>
                          {operacoes.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{operacoes.length - 2}
                            </span>
                          )}
                        </div>
                      )}
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
                          {driver.local_disponibilidade && (
                            <p className="text-[10px] text-slate-500 mt-1">
                              {isFuture
                                ? `Esse motorista informou que estaria nesse local na data prevista.`
                                : `Último local previsto informado: ${driver.local_disponibilidade}`}
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
