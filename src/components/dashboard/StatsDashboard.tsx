
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Clock, CheckCircle, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteAnalyticsModal } from "./RouteAnalyticsModal";
import { useToast } from "@/hooks/use-toast";
import { publicDirectus } from "@/lib/directus";
import { readItems } from "@directus/sdk";

type PeriodFilter = 'hoje' | 'mes' | 'tudo';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--chart-4))'];

export const StatsDashboard = () => {
  const { toast } = useToast();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('hoje');
  const [frotaProdutoFilter, setFrotaProdutoFilter] = useState<string>('todos');
  const [frotaRotaFilter, setFrotaRotaFilter] = useState<string>('todos');
  const [rotasProdutoFilter, setRotasProdutoFilter] = useState<string>('Arroz');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Helper function to filter by date
  const getDateFilter = (period: PeriodFilter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === 'hoje') {
      return today.toISOString().split('T')[0];
    } else if (period === 'mes') {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return firstDayOfMonth.toISOString().split('T')[0];
    }
    return null; // 'tudo'
  };

  // 1. Fetch Frota data (REAL) - Active Drivers & Availability
  const { data: frotaData, isLoading: frotaLoading } = useQuery({
    queryKey: ['frota-real', periodFilter, frotaProdutoFilter, frotaRotaFilter],
    queryFn: async () => {
      try {
        // Fetch ALL recent availability records
        const disponiveis = await publicDirectus.request(readItems('disponivel', {
          fields: ['*', 'motorista_id.id', 'motorista_id.nome', 'motorista_id.sobrenome'],
          sort: ['-date_created'],
          limit: 1000
        }));

        // Deduplicate: Keep only the most recent record per driver
        const latestStatusMap = new Map();
        for (const item of disponiveis) {
          const driverId = item.motorista_id?.id || item.motorista_id;
          if (driverId && !latestStatusMap.has(driverId)) {
            latestStatusMap.set(driverId, item);
          }
        }

        // Only consider drivers currently 'disponivel' for the main bar chart
        const activeDrivers: any[] = Array.from(latestStatusMap.values())
          .filter((item: any) => item.status === 'disponivel');

        return activeDrivers.map(d => ({
          id: d.id,
          produto: 'Geral', // In future, this could come from driver preferences
          rota: d.local_disponibilidade || d.localizacao_atual || 'Não Informado',
          disponiveis: 1,
          data: d.date_created.split('T')[0]
        }));

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return [];
      }
    }
  });

  // 2. Fetch Rotas data (REAL from embarques)
  const { data: rotasData, isLoading: rotasLoading } = useQuery({
    queryKey: ['rotas-real', periodFilter],
    queryFn: async () => {
      try {
        const filter: any = {};
        const dateFilter = getDateFilter(periodFilter);
        if (dateFilter) {
          filter.date_created = { _gte: dateFilter };
        }

        const embarques = await publicDirectus.request(readItems('embarques', {
          fields: ['origin', 'destination', 'produto_predominante'],
          filter: filter,
          limit: 1000
        }));

        const routeStats = embarques.reduce((acc: any, curr: any) => {
          if (!curr.origin || !curr.destination) return acc;
          const routeName = `${curr.origin.split('-')[0].trim()} -> ${curr.destination.split('-')[0].trim()}`;
          const produto = curr.produto_predominante || 'Diversos';
          const key = `${routeName}|${produto}`;

          if (!acc[key]) {
            acc[key] = { rota: routeName, produto, quantidade: 0 };
          }
          acc[key].quantidade += 1;
          return acc;
        }, {});

        return Object.values(routeStats) as { rota: string, produto: string, quantidade: number }[];
      } catch (err) {
        console.error("Erro ao buscar rotas:", err);
        return [];
      }
    }
  });

  // 3. Fetch Acionamento Real Logic (Status Distribution)
  const { data: acionamentoData, isLoading: acionamentoLoading } = useQuery({
    queryKey: ['acionamento-real-dist', periodFilter],
    queryFn: async () => {
      try {
        // Fetch all latest availability again to build the distribution pie chart
        const disponiveis = await publicDirectus.request(readItems('disponivel', {
          fields: ['status', 'motorista_id'],
          sort: ['-date_created'],
          limit: 1000
        }));

        const uniqueDrivers = new Set();
        const stats = { disponivel: 0, indisponivel: 0 };
        // Note: 'em_viagem' would typically come from 'embarques' active status check, 
        // but for now we rely on explicit availability status if available.

        for (const item of disponiveis) {
          const mId = typeof item.motorista_id === 'object' ? (item.motorista_id as any)?.id : item.motorista_id;
          if (mId && !uniqueDrivers.has(mId)) {
            uniqueDrivers.add(mId);
            if (item.status === 'disponivel') stats.disponivel++;
            else stats.indisponivel++;
          }
        }

        // To make it more real, let's also count drivers currently 'in_transit' in embarques
        // independent of their 'availability' record (which might be stale)
        const activeTrips = await publicDirectus.request(readItems('embarques', {
          filter: { status: { _in: ['in_transit', 'loading', 'unloading'] } },
          fields: ['motorista_id'] // assuming there is a link, or we just count count
        }));

        const driversInTrip = activeTrips.length; // Approximate for chart

        // Return data for Pie Chart
        const data = [
          { name: 'Disponível', value: stats.disponivel },
          { name: 'Em Viagem', value: driversInTrip },
          { name: 'Indisponível', value: stats.indisponivel }
        ];

        return data.filter(d => d.value > 0); // Hide zero segments
      } catch (e) {
        console.error("Error fetching status distribution", e);
        return [];
      }
    }
  });

  // 4. Fetch Top Drivers Real Logic
  const { data: topDrivers, isLoading: topDriversLoading } = useQuery({
    queryKey: ['top-motoristas-real', periodFilter],
    queryFn: async () => {
      try {
        const filter: any = { status: { _eq: 'delivered' } }; // Only completed trips count?
        const dateFilter = getDateFilter(periodFilter);
        if (dateFilter) {
          filter.actual_arrival_time = { _gte: dateFilter };
        }

        // Directus aggregation doesn't easily support "group by relation field name" directly in SDK types sometimes,
        // so we fetch items and aggregate in JS for flexibility or use groupBy if supported.
        // Fetching shipments with driver info
        const shipments = await publicDirectus.request(readItems('embarques', {
          fields: ['motorista_id.nome', 'motorista_id.sobrenome'],
          filter: filter,
          limit: 500
        }));

        const driverCounts: Record<string, number> = {};

        shipments.forEach((s: any) => {
          if (s.motorista_id) {
            const name = `${s.motorista_id.nome || ''} ${s.motorista_id.sobrenome || ''}`.trim();
            if (name) {
              driverCounts[name] = (driverCounts[name] || 0) + 1;
            }
          }
        });

        const sorted = Object.entries(driverCounts)
          .map(([name, trips]) => ({ name, trips }))
          .sort((a, b) => b.trips - a.trips)
          .slice(0, 5); // Top 5

        return sorted;
      } catch (e) {
        console.error("Error fetching top drivers:", e);
        return [];
      }
    }
  });


  // Calculate totals
  const totalVeiculos = useMemo(() => {
    return frotaData?.reduce((sum: number, item: any) => sum + item.disponiveis, 0) || 0;
  }, [frotaData]);

  const frotaChartData = useMemo(() => {
    if (!frotaData) return [];

    const routeTotals = frotaData.reduce((acc: any, item: any) => {
      if (!acc[item.rota]) {
        acc[item.rota] = 0;
      }
      acc[item.rota] += item.disponiveis;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(routeTotals)
      .map(([rota, disponiveis]) => ({ rota, disponiveis }))
      .sort((a: any, b: any) => b.disponiveis - a.disponiveis);
  }, [frotaData]);

  const top10Rotas = useMemo(() => {
    if (!rotasData) return [];
    let filtered = rotasData;
    if (rotasProdutoFilter && rotasProdutoFilter !== 'todos') {
      filtered = rotasData.filter(r => r.produto === rotasProdutoFilter);
    }
    return filtered
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [rotasData, rotasProdutoFilter]);

  const availableProdutos = useMemo(() => {
    if (!frotaData) return ['todos'];
    const produtos = Array.from(new Set(frotaData.map((item: any) => item.produto)));
    return ['todos', ...produtos.sort()];
  }, [frotaData]);

  const availableRotas = useMemo(() => {
    if (!frotaData) return ['todos'];
    const rotas = Array.from(new Set(frotaData.map((item: any) => item.rota)));
    return ['todos', ...rotas.sort()];
  }, [frotaData]);

  // KPIs Query
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard-kpis-real'],
    queryFn: async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [activeShipments, waitingOffers, completedToday, revenueMonth] = await Promise.all([
          publicDirectus.request(readItems('embarques', {
            filter: { status: { _in: ['in_transit', 'loading', 'unloading'] } },
            aggregate: { count: '*' }
          })),
          publicDirectus.request(readItems('vehicle_matches', {
            filter: { status: { _eq: 'offered' } },
            aggregate: { count: '*' }
          })),
          publicDirectus.request(readItems('embarques', {
            filter: {
              status: { _eq: 'delivered' },
              actual_arrival_time: { _gte: today.toISOString() }
            },
            aggregate: { count: '*' }
          })),
          publicDirectus.request(readItems('embarques', {
            filter: {
              status: { _eq: 'delivered' },
              actual_arrival_time: { _gte: startOfMonth.toISOString() }
            },
            aggregate: { sum: 'total_value' }
          }))
        ]);

        return {
          active: (activeShipments as any)[0]?.count || 0,
          waiting: (waitingOffers as any)[0]?.count || 0,
          completed: (completedToday as any)[0]?.count || 0,
          revenue: (revenueMonth as any)[0]?.sum?.total_value || 0
        };
      } catch (err) {
        console.error("Error fetching KPIs:", err);
        return { active: 0, waiting: 0, completed: 0, revenue: 0 };
      }
    },
    refetchInterval: 30000
  });

  return (
    <div className="space-y-6 opacity-50">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl text-gray-400">Dashboard Operacional - Visão em Tempo Real</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Monitoramento completo de operações, veículos e cargas
              </p>
            </div>
            <div className="text-gray-400 text-4xl">🚧</div>
            <div className="flex gap-2">
              <Select value={frotaProdutoFilter} onValueChange={setFrotaProdutoFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Produtos</SelectItem>
                  {availableProdutos.filter(p => p !== 'todos').map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  {/* Assuming static list if data is empty is NOT desired, we rely on availableProdutos which comes from real data */}
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="tudo">Tudo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard title="Veículos Disponíveis" icon={Truck} value={totalVeiculos} label="Prontos para carga" loading={frotaLoading} iconColor="text-success" />
        <KPICard title="Em Andamento" icon={Package} value={kpiData?.active} label="Fretes ativos" loading={kpiLoading} iconColor="text-primary" />
        <KPICard title="Aguardando Resposta" icon={Clock} value={kpiData?.waiting} label="Ofertas enviadas" loading={kpiLoading} iconColor="text-warning" />
        <KPICard title="Concluídos Hoje" icon={CheckCircle} value={kpiData?.completed} label="Entregas realizadas" loading={kpiLoading} iconColor="text-success" />
        <KPICard
          title="Receita do Mês"
          icon={DollarSign}
          value={(kpiData?.revenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          label="Faturamento acumulado"
          loading={kpiLoading}
          iconColor="text-success"
        />
      </div>

      <h3 className="text-2xl font-bold tracking-tight mb-4">Visão Geral</h3>

      <div className="grid gap-4 md:grid-cols-2">
        {/* FROTA/VEHICLES BAR CHART */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Veículos Disponíveis por Local
            </CardTitle>
          </CardHeader>
          <CardContent>
            {frotaLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : frotaChartData.length === 0 ? (
              <EmptyState message="Nenhum veículo disponível encontrado online." />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={frotaChartData} onClick={(data: any) => data?.activeLabel && setSelectedRoute(data.activeLabel)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rota" height={60} fontSize={10} label={{ value: 'Local/Rota', position: 'insideBottom', offset: -5 }} />
                  <YAxis />
                  <Tooltip cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} />
                  <Bar dataKey="disponiveis" fill="hsl(var(--primary))" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* STATUS PIE CHART */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Status da Frota
            </CardTitle>
          </CardHeader>
          <CardContent>
            {acionamentoLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (!acionamentoData || acionamentoData.length === 0) ? (
              <EmptyState message="Sem dados de status de motoristas." />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={acionamentoData}
                    cx="50%" cy="50%"
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {acionamentoData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* ROUTES CHART */}
        <Card className="shadow-card col-span-full lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Rotas Mais Utilizadas
              </CardTitle>
              {/* Product filter for routes */}
              <Select value={rotasProdutoFilter} onValueChange={setRotasProdutoFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filtro de Produto" />
                </SelectTrigger>
                <SelectContent>
                  {/* We use availableProdutos here but ideally we should fetch available products from routes data too */}
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Arroz">Arroz</SelectItem>
                  <SelectItem value="Milho">Milho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {rotasLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : top10Rotas.length === 0 ? (
              <EmptyState message="Nenhuma viagem registrada neste período." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top10Rotas} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="rota" type="category" width={150} fontSize={10} />
                  <Tooltip cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} />
                  <Bar dataKey="quantidade" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* TOP DRIVERS LIST */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Top Motoristas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topDriversLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (!topDrivers || topDrivers.length === 0) ? (
              <EmptyState message="Sem dados de motoristas no período." simple />
            ) : (
              topDrivers.map((driver: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">{driver.trips} viagens concluídas</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-success opacity-50" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <RouteAnalyticsModal
        open={!!selectedRoute}
        onOpenChange={(open) => !open && setSelectedRoute(null)}
        route={selectedRoute || ''}
        product={selectedProduct || undefined}
      />
    </div>
  );
};

// Subcomponent for simple KPI Cards to reduce duplicates
function KPICard({ title, icon: Icon, value, label, loading, iconColor = "text-primary" }: any) {
  return (
    <Card className="shadow-card transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : (value || 0)}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// Subcomponent for Empty States
function EmptyState({ message, simple = false }: { message: string, simple?: boolean }) {
  if (simple) {
    return <div className="text-sm text-muted-foreground text-center py-4">{message}</div>;
  }
  return (
    <div className="flex flex-col items-center justify-center h-full py-10 opacity-70">
      <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground text-center">{message}</p>
    </div>
  );
}
