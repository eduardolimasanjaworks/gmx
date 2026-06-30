import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { readItems } from '@directus/sdk';
import { directus, directusAdminItems } from '@/lib/directus';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { fetchAddressByCep } from '@/lib/cepLookup';
import {
  coordenadasMotorista,
  corStatus,
  extrairOperacoesDriver,
  getDistanceFromLatLonInKm,
  normalizarOperacao,
  normalizarTexto,
} from './tracking-geo-utils';

export const ENABLE_SAVED_LOCATIONS = false;

export type DriverHistoryPoint = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  date_created?: string | null;
};

export function useVehicleTrackingState() {
  const [searchParams] = useSearchParams();
  const urlDate = searchParams.get('load_date');
  const urlLat = searchParams.get('load_lat');
  const urlLng = searchParams.get('load_lng');

  const [selectedDriver, setSelectedDriver] = useState<unknown>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    urlLat && urlLng ? [Number(urlLat), Number(urlLng)] : [-15.7801, -47.9292],
  );
  const [mapZoom, setMapZoom] = useState<number>(urlLat && urlLng ? 8 : 4);
  const [timeTravelDate, setTimeTravelDate] = useState<Date | undefined>(
    urlDate ? new Date(urlDate) : undefined,
  );
  const [timeTravelEndDate, setTimeTravelEndDate] = useState<Date | undefined>(
    urlDate ? new Date(urlDate) : undefined,
  );
  const [radiusKm, setRadiusKm] = useState<number[]>([150]);
  const [originPoint, setOriginPoint] = useState<[number, number] | null>(
    urlLat && urlLng ? [Number(urlLat), Number(urlLng)] : null,
  );
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);
  const [showDisponivel, setShowDisponivel] = useState(true);
  const [showRetornando, setShowRetornando] = useState(true);
  const [showCarregado, setShowCarregado] = useState(true);
  const [showSomentePrevistos, setShowSomentePrevistos] = useState(false);
  const [isSearchingFactory, setIsSearchingFactory] = useState(false);
  const [factorySearchTerm, setFactorySearchTerm] = useState('');
  const [factoryName, setFactoryName] = useState('');
  const [savedFactoryName, setSavedFactoryName] = useState('Sua Fábrica/Empresa');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);

  const { toast } = useToast();
  const { refreshToken, user } = useAuth();

  const dataFiltroReferencia = useMemo(() => {
    const d = new Date(timeTravelEndDate ?? timeTravelDate ?? new Date());
    d.setHours(23, 59, 59, 999);
    return d;
  }, [timeTravelDate, timeTravelEndDate]);

  const fetchDrivers = async () => {
    let filterQuery: unknown = undefined;
    if (timeTravelDate || timeTravelEndDate) {
      const startBase = timeTravelDate ?? timeTravelEndDate;
      const endBase = timeTravelEndDate ?? timeTravelDate;
      const startOfDay = new Date(startBase || new Date());
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(endBase || startOfDay);
      endOfDay.setHours(23, 59, 59, 999);
      filterQuery = { date_created: { _gte: startOfDay.toISOString(), _lte: endOfDay.toISOString() } };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryOpts: any = { fields: ['*', 'motorista_id.*'], sort: ['-date_created'], limit: -1 };
    if (filterQuery) queryOpts.filter = filterQuery;
    const disponiveis = await directus.request(readItems('disponivel', queryOpts));
    const latestStatusMap = new Map();
    for (const item of disponiveis) {
      const d = item as Record<string, unknown>;
      const mi = d?.motorista_id as Record<string, unknown> | undefined;
      const driverId = mi?.id || d?.motorista_id;
      if (driverId && !latestStatusMap.has(driverId)) latestStatusMap.set(driverId, item);
    }
    return Array.from(latestStatusMap.values()).filter((item: unknown) => {
      const d = item as Record<string, unknown>;
      const st = normalizarTexto(d?.status);
      const elegivel = d.disponivel === true || st === 'disponivel' || st === 'retornando' || st === 'carregado';
      if (!elegivel) return false;
      if (timeTravelDate || timeTravelEndDate) {
        const endOfDay = new Date(timeTravelEndDate ?? timeTravelDate ?? new Date());
        endOfDay.setHours(23, 59, 59, 999);
        if (d.data_previsao_disponibilidade) return new Date(String(d.data_previsao_disponibilidade)) <= endOfDay;
        return new Date(String(d.date_created)) <= endOfDay;
      }
      return true;
    });
  };

  const { data: fetchedDrivers = [], isLoading, isError } = useQuery({
    queryKey: ['tracking-map-drivers', timeTravelDate?.toISOString(), timeTravelEndDate?.toISOString()],
    queryFn: async () => {
      try { return await fetchDrivers(); }
      catch (error: unknown) {
        const e = error as Record<string, unknown>;
        if (e?.response?.status === 401 || e?.message === 'Token expired.') {
          await refreshToken();
          return await fetchDrivers();
        }
        throw error;
      }
    },
    refetchInterval: timeTravelDate ? false : 15000,
  });

  const allAvailableDrivers = useMemo(() => {
    let filtered = [...fetchedDrivers];
    filtered = filtered.filter((d: unknown) => {
      const dr = d as Record<string, unknown>;
      const st = normalizarTexto(dr?.status);
      if (st === 'carregado') return showCarregado;
      if (st === 'retornando') return showRetornando;
      return showDisponivel;
    });
    if (selectedOperations.length > 0) {
      const filtro = new Set(selectedOperations.map(normalizarOperacao));
      filtered = filtered.filter((d: unknown) => {
        const ops = extrairOperacoesDriver(d);
        return ops.length === 0 || ops.some((op) => filtro.has(op));
      });
    }
    if (showSomentePrevistos) {
      filtered = filtered.filter((d: unknown) => {
        const dr = d as Record<string, unknown>;
        return Boolean(dr?.local_liberacao_prevista || dr?.local_disponibilidade) && Boolean(dr?.data_previsao_disponibilidade);
      });
    }
    if (originPoint) {
      const MAX_KM = radiusKm[0];
      filtered = filtered.filter((d: unknown) => {
        const coords = coordenadasMotorista(d, dataFiltroReferencia);
        if (!coords) return false;
        return getDistanceFromLatLonInKm(originPoint[0], originPoint[1], coords[0], coords[1]) <= MAX_KM;
      });
    }
    return filtered;
  }, [fetchedDrivers, originPoint, radiusKm, selectedOperations, showCarregado, showDisponivel, showRetornando, showSomentePrevistos, dataFiltroReferencia]);

  const drivers = allAvailableDrivers
    .map((d: unknown) => ({ driver: d, coords: coordenadasMotorista(d, dataFiltroReferencia) }))
    .filter((item) => Boolean(item.coords));

  const markers = drivers.map(({ driver: d, coords }) => {
    const dr = d as Record<string, unknown>;
    const motorista = dr?.motorista_id as Record<string, unknown> | undefined;
    return {
      id: dr.id,
      position: coords as [number, number],
      color: corStatus(d, dataFiltroReferencia),
      size: 'medium',
      popup: {
        title: `${motorista?.nome || 'Motorista'} ${motorista?.sobrenome || ''}`,
        content: `${dr.localizacao_atual || 'Localização não informada'}\nStatus: ${String(dr.status || 'disponivel')}`,
        image: motorista?.foto ? `https://gmx.sanjaworks.com/api/assets/${motorista.foto}` : undefined,
      },
      driverData: d,
    };
  });

  const { data: driverHistory = [] } = useQuery({
    queryKey: ['driver-history', (selectedDriver as Record<string, unknown>)?.motorista_id],
    enabled: !!selectedDriver,
    queryFn: async () => {
      const d = selectedDriver as Record<string, unknown>;
      const mi = d?.motorista_id as Record<string, unknown> | undefined;
      const motoristaId = mi?.id || d?.motorista_id;
      if (!motoristaId) return [];
      try {
        return await directusAdminItems<DriverHistoryPoint>('historico_localizacao', {
          filter: JSON.stringify({ motorista_id: { _eq: motoristaId } }),
          sort: 'date_created',
          limit: '100',
        });
      } catch { return []; }
    },
  });

  const { data: savedLocations = [], isLoading: isLoadingLocs } = useQuery({
    queryKey: ['saved-locations', user?.id],
    enabled: ENABLE_SAVED_LOCATIONS && !!user?.id,
    queryFn: async () => {
      try {
        return await directus.request(readItems('locais_salvos', {
          filter: { user_created: { _eq: user.id } },
          sort: ['-date_created'],
        }));
      } catch { return []; }
    },
  });

  const handleSearchFactory = async () => {
    if (!factorySearchTerm.trim()) return;
    setIsSearching(true);
    try {
      const cep = factorySearchTerm.match(/\b\d{5}-?\d{3}\b/)?.[0];
      const enderecoCep = cep ? await fetchAddressByCep(cep).catch(() => null) : null;
      const queryBase = enderecoCep
        ? `${factorySearchTerm}, ${enderecoCep.endereco}, ${enderecoCep.bairro}, ${enderecoCep.cidade} ${enderecoCep.estado}, Brasil`
        : `${factorySearchTerm}, Brasil`;
      const params = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', limit: '8', countrycodes: 'br', dedupe: '1', q: queryBase });
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } });
      const results = await resp.json();
      if (results?.length > 0) {
        const tokens = queryBase.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((t) => t.length >= 2);
        const numero = queryBase.match(/\b\d{1,6}\b/)?.[0];
        const pontuar = (c: Record<string, unknown>) => {
          const display = String(c.display_name ?? '').toLowerCase();
          const addr = (c.address ?? {}) as Record<string, unknown>;
          let s = Number(c.importance ?? 0) * 4;
          s += tokens.filter((t) => display.includes(t)).length * 2;
          const hn = String(addr.house_number ?? '');
          if (numero && hn === numero) s += 8; else if (numero && display.includes(numero)) s += 4;
          const ct = `${c.class ?? ''}:${c.type ?? ''}`;
          if (/highway|building|house/.test(ct)) s += 2;
          if (/city|state|administrative/.test(ct)) s -= 2;
          return s;
        };
        const melhor = [...results].sort((a, b) => pontuar(b) - pontuar(a))[0] as Record<string, unknown>;
        const newPoint: [number, number] = [parseFloat(String(melhor.lat)), parseFloat(String(melhor.lon))];
        setOriginPoint(newPoint);
        setMapCenter(newPoint);
        setMapZoom(13);
        setSavedFactoryName(factoryName.trim() || 'Sua Fábrica/Empresa');
        setIsSearchingFactory(false);
        setFactorySearchTerm('');
        setFactoryName('');
      } else {
        toast({ title: 'Não Encontrado', description: 'Tente ser mais específico.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro na Busca', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFocusSavedLocation = (loc: Record<string, unknown>) => {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      setOriginPoint([lat, lng]); setMapCenter([lat, lng]); setMapZoom(13);
      setSavedFactoryName(String(loc.nome || 'Fábrica Salva'));
      toast({ title: 'Fábrica Selecionada', description: `Buscando motoristas perto de ${loc.nome}` });
    }
  };

  return {
    selectedDriver, setSelectedDriver,
    mapCenter, setMapCenter,
    mapZoom, setMapZoom,
    timeTravelDate, setTimeTravelDate,
    timeTravelEndDate, setTimeTravelEndDate,
    radiusKm, setRadiusKm,
    originPoint, setOriginPoint,
    isSelectingOrigin, setIsSelectingOrigin,
    showDisponivel, setShowDisponivel,
    showRetornando, setShowRetornando,
    showCarregado, setShowCarregado,
    showSomentePrevistos, setShowSomentePrevistos,
    isSearchingFactory, setIsSearchingFactory,
    factorySearchTerm, setFactorySearchTerm,
    factoryName, setFactoryName,
    savedFactoryName,
    isSearching,
    selectedOperations, setSelectedOperations,
    fetchedDrivers, isLoading, isError,
    allAvailableDrivers, drivers, markers,
    driverHistory, savedLocations, isLoadingLocs,
    dataFiltroReferencia,
    handleSearchFactory, handleFocusSavedLocation,
  };
}
