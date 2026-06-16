/**
 * @module telemetria/components/TelemetriaPanel
 * @purpose Tela única de telemetria para presença de usuários online/foco/offline.
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTelemetriaQuery } from '../hooks/useTelemetriaQuery';

const STATUS_LABEL: Record<string, string> = {
  em_foco: 'Em foco',
  aba_aberta_sem_foco: 'Aba aberta sem foco',
  aba_oculta: 'Aba oculta',
  em_pausa: 'Em pausa',
  offline: 'Offline',
};

const STATUS_VARIANT: Record<string, string> = {
  em_foco: 'bg-emerald-600 hover:bg-emerald-600',
  aba_aberta_sem_foco: 'bg-blue-600 hover:bg-blue-600',
  aba_oculta: 'bg-amber-600 hover:bg-amber-600',
  em_pausa: 'bg-orange-600 hover:bg-orange-600',
  offline: 'bg-slate-500 hover:bg-slate-500',
};

function intervalMinutesFromParam(value: string | null) {
  if (value === '1h') return 60;
  if (value === '6h') return 360;
  if (value === '24h') return 1440;
  return 15;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s atrás`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min atrás`;
  const hours = Math.floor(min / 60);
  return `${hours}h atrás`;
}

export function TelemetriaPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const intervalParam = searchParams.get('interval') || '15m';
  const intervalMinutes = intervalMinutesFromParam(intervalParam);
  const [search, setSearch] = useState('');
  const query = useTelemetriaQuery(intervalMinutes);

  const handleIntervalChange = (value: string) => {
    setSearchParams((prev) => {
      prev.set('interval', value);
      return prev;
    });
  };

  const rows = useMemo(() => {
    const all = query.data?.rows ?? [];
    const sorted = [...all].sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((r) =>
      `${r.userName} ${r.userEmail} ${r.currentPath}`.toLowerCase().includes(q),
    );
  }, [query.data?.rows, search]);

  const onlineCount = useMemo(() => rows.filter((r) => r.isOnline).length, [rows]);

  const summary = query.data?.summary ?? {
    total: 0,
    em_foco: 0,
    aba_aberta_sem_foco: 0,
    aba_oculta: 0,
    em_pausa: 0,
    offline: 0,
  };

  if (query.isLoading && !query.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Telemetria</h2>
          <p className="text-sm text-muted-foreground">
            Monitoramento ao vivo vinculado ao cadastro de usuários (atualiza a cada 5s)
          </p>
          {query.dataUpdatedAt ? (
            <p className="text-[11px] text-emerald-700 font-semibold mt-1">
              Última leitura: {new Date(query.dataUpdatedAt).toLocaleTimeString('pt-BR')}
            </p>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs font-semibold w-fit">
              Janela: {intervalParam}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Histórico exibido</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleIntervalChange('15m')}>15m</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleIntervalChange('1h')}>1h</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleIntervalChange('6h')}>6h</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleIntervalChange('24h')}>24h</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">Total</p><p className="text-3xl font-bold">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">Em foco</p><p className="text-3xl font-bold text-emerald-700">{summary.em_foco}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">Sem foco</p><p className="text-3xl font-bold text-blue-700">{summary.aba_aberta_sem_foco}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">Aba oculta</p><p className="text-3xl font-bold text-amber-700">{summary.aba_oculta}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">Em pausa</p><p className="text-3xl font-bold text-orange-700">{summary.em_pausa}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs uppercase text-muted-foreground">Offline</p><p className="text-3xl font-bold text-slate-700">{summary.offline}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuários monitorados</CardTitle>
          <Input
            placeholder="Buscar por nome, e-mail ou rota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 max-w-md"
          />
        </CardHeader>
        <CardContent>
          {query.isError ? (
            <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Não foi possível carregar telemetria. Verifique a coleção Directus `telemetria_eventos` e permissões.
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado em app_users para monitorar.
            </div>
          ) : onlineCount === 0 ? (
            <div className="space-y-4">
              <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Nenhum operador em plantão ativo agora. Peça para clicar em <strong>Estou trabalhando</strong> no header.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3">Usuário (cadastro)</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.userKey} className="border-b opacity-80">
                        <td className="py-2 pr-3">
                          <p className="font-medium">{row.userName}</p>
                          <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge className={`${STATUS_VARIANT[row.status]} text-white`}>
                            {STATUS_LABEL[row.status] ?? row.status}
                          </Badge>
                        </td>
                        <td className="py-2">{row.isOnline ? relativeTime(row.lastSeen) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Usuário</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Abas</th>
                    <th className="py-2 pr-3">Rota</th>
                    <th className="py-2 pr-3">Último evento</th>
                    <th className="py-2">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.userKey} className="border-b">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{row.userName}</p>
                        <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge className={`${STATUS_VARIANT[row.status]} text-white`}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{row.tabCount}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.currentPath}</td>
                      <td className="py-2 pr-3 uppercase text-xs">{row.lastEventType}</td>
                      <td className="py-2">{relativeTime(row.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
