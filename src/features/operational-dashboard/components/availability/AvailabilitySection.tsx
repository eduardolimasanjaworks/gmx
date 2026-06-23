/**
 * @module operational-dashboard/components/availability/AvailabilitySection
 * @purpose Disponibilidade diária com detalhe ao clicar na barra (layout Miro).
 */

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import type { DashboardFilterApi } from '../../hooks/useDashboardFilterState';
import { useAvailabilityDaily } from '../../hooks/useAvailabilityDaily';
import { DashboardEmptyState } from '../shared/DashboardEmptyState';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AvailabilitySectionProps {
  filters: DashboardFilterApi;
}

export function AvailabilitySection({ filters }: AvailabilitySectionProps) {
  const { state, globalRange, setAvailabilitySearch, setSelectedAvailabilityDay } = filters;
  const [fromDate, setFromDate] = useState(globalRange.from.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(globalRange.to.toISOString().slice(0, 10));
  const [searchBy, setSearchBy] = useState({
    motorista: true,
    origem: true,
    veiculo: true,
  });

  const effectiveRange = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : globalRange.from;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : globalRange.to;
    return { from, to };
  }, [fromDate, toDate, globalRange.from, globalRange.to]);

  const { data, isLoading } = useAvailabilityDaily(effectiveRange, '');

  const detailsByDay = useMemo(() => {
    const q = state.availabilitySearch.trim().toLowerCase();
    const selectedFields = Object.entries(searchBy)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const map = new Map<number, typeof data extends { detailsByDay: infer T } ? T : any>();
    if (!data?.detailsByDay) return new Map<number, any[]>();

    data.detailsByDay.forEach((rows, day) => {
      const filteredRows = rows.filter((row) => {
        if (!q) return true;
        const chunks: string[] = [];
        if (selectedFields.includes('motorista')) chunks.push(row.driverName);
        if (selectedFields.includes('origem')) chunks.push(row.origin);
        if (selectedFields.includes('veiculo')) chunks.push(row.vehicleLabel);
        return chunks.join(' ').toLowerCase().includes(q);
      });
      if (filteredRows.length > 0) {
        map.set(day, filteredRows);
      }
    });
    return map as Map<number, any[]>;
  }, [data?.detailsByDay, state.availabilitySearch, searchBy]);

  const tableRows = useMemo(
    () =>
      [...detailsByDay.entries()]
        .sort(([a], [b]) => a - b)
        .map(([day, rows]) => ({ day, count: rows.length })),
    [detailsByDay],
  );

  const details = useMemo(() => {
    const day = state.selectedAvailabilityDay;
    if (day == null) return [];
    return detailsByDay.get(day) ?? [];
  }, [state.selectedAvailabilityDay, detailsByDay]);

  const monthLabel = format(globalRange.from, 'MMMM', { locale: ptBR }).toUpperCase();

  return (
    <section className="space-y-4 rounded-xl border-2 border-slate-400 bg-white p-4 shadow-md">
      <div className="inline-block rounded-md border-2 border-slate-800 bg-white px-4 py-2">
        <h2 className="text-lg font-black uppercase text-emerald-600">Disponibilidade</h2>
      </div>

      <Input
        placeholder="Filtro: motorista, origem ou veículo..."
        value={state.availabilitySearch}
        onChange={(e) => setAvailabilitySearch(e.target.value)}
        className="max-w-md border-2 border-slate-400"
      />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-600">De</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-600">Até</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-600">Buscar por</label>
          <div className="flex gap-3 rounded-md border bg-slate-50 px-3 py-2">
            <label className="flex items-center gap-1 text-xs">
              <Checkbox checked={searchBy.motorista} onCheckedChange={(v) => setSearchBy((s) => ({ ...s, motorista: Boolean(v) }))} />
              Motorista
            </label>
            <label className="flex items-center gap-1 text-xs">
              <Checkbox checked={searchBy.origem} onCheckedChange={(v) => setSearchBy((s) => ({ ...s, origem: Boolean(v) }))} />
              Origem
            </label>
            <label className="flex items-center gap-1 text-xs">
              <Checkbox checked={searchBy.veiculo} onCheckedChange={(v) => setSearchBy((s) => ({ ...s, veiculo: Boolean(v) }))} />
              Veículo
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border-2 border-slate-500">
        <div className="bg-lime-400 px-4 py-2 border-b-2 border-slate-700">
          <h3 className="text-sm font-bold uppercase text-slate-900">
            Disponibilidade diária — {monthLabel}
          </h3>
        </div>
        <div className="bg-white p-4">
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : tableRows.length === 0 ? (
            <DashboardEmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-700 bg-slate-100 text-left">
                    <th className="p-2 font-bold text-slate-900">Dia</th>
                    <th className="p-2 font-bold text-slate-900">Qtd. disponíveis</th>
                    <th className="p-2 font-bold text-slate-900">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.day} className="border-b border-slate-300">
                      <td className="p-2 font-medium text-slate-900">{row.day}</td>
                      <td className="p-2 tabular-nums font-semibold">{row.count}</td>
                      <td className="p-2">
                        <button
                          className="text-xs font-semibold text-emerald-700 underline"
                          onClick={() => setSelectedAvailabilityDay(row.day)}
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {state.selectedAvailabilityDay != null && (
        <div className="rounded-lg border-2 border-slate-500 bg-slate-100 p-4">
          <h3 className="mb-3 text-center text-sm font-bold uppercase text-emerald-700">
            Disponibilidade detalhadas — dia {state.selectedAvailabilityDay}
          </h3>
          {details.length === 0 ? (
            <DashboardEmptyState title="Sem registros neste dia" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-700 bg-slate-50 text-left">
                    <th className="p-2 font-bold text-slate-900">Motorista</th>
                    <th className="p-2 font-bold text-slate-900">Origem</th>
                    <th className="p-2 font-bold text-slate-900">Veículo</th>
                    <th className="p-2 font-bold text-slate-900">Data/hora</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row) => (
                    <tr key={row.id} className="border-b border-slate-300">
                      <td className="p-2 font-medium">{row.driverName}</td>
                      <td className="p-2">{row.origin}</td>
                      <td className="p-2">{row.vehicleLabel}</td>
                      <td className="p-2">{new Date(row.dateCreated).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
