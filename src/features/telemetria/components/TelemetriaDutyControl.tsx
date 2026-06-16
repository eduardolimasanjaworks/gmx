/**
 * @module telemetria/components/TelemetriaDutyControl
 * @purpose Controle global de plantão no header (referência: ESTOU TRABALHANDO / pausa / status verde).
 */

import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOperatorHeartbeat } from '@/hooks/useOperatorHeartbeat';
import type { TelemetryTabState } from '../types/telemetry';

const TAB_STATE_LABEL: Record<TelemetryTabState, string> = {
  TAB_ACTIVE_FOCUSED: 'Em foco',
  TAB_ACTIVE_VISIBLE_UNFOCUSED: 'Aba visível (sem foco)',
  TAB_ACTIVE_HIDDEN: 'Aba oculta',
  TAB_POSSIBLY_SUSPENDED: 'Possível suspensão',
  TAB_PROBABLY_CLOSED: 'Aba fechada',
};

const PAUSE_OPTIONS = [
  { label: '5 minutos', minutes: 5 },
  { label: '10 minutos', minutes: 10 },
  { label: '15 minutos', minutes: 15 },
  { label: '30 minutos', minutes: 30 },
  { label: '1 hora', minutes: 60 },
];

function formatRemaining(ms: number) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatUntil(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function TelemetriaDutyControl() {
  const {
    isDutyActive,
    isPaused,
    pauseUntil,
    pauseRemainingMs,
    visualState,
    tabState,
    startDuty,
    stopDuty,
    startPause,
    cancelPause,
  } = useOperatorHeartbeat();

  const dotClass =
    visualState === 'trabalhando'
      ? 'bg-emerald-500 shadow-[0_0_12px_2px_rgba(16,185,129,0.75)] animate-pulse'
      : visualState === 'pausado'
        ? 'bg-amber-500 shadow-[0_0_10px_2px_rgba(245,158,11,0.6)]'
        : 'bg-slate-400';

  const statusText =
    visualState === 'inativo'
      ? 'Plantão inativo'
      : visualState === 'pausado'
        ? `Em pausa · volta às ${pauseUntil ? formatUntil(pauseUntil) : '--:--'}`
        : `Trabalhando · ${TAB_STATE_LABEL[tabState]}`;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 shadow-sm">
      <span className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`} aria-hidden />

      <div className="hidden sm:block min-w-[140px] max-w-[220px]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700 leading-tight">
          {visualState === 'trabalhando' ? 'Online no plantão' : visualState === 'pausado' ? 'Pausa ativa' : 'Fora do plantão'}
        </p>
        <p className="text-[11px] text-slate-600 leading-tight truncate" title={statusText}>
          {statusText}
          {isPaused && pauseRemainingMs > 0 ? ` (${formatRemaining(pauseRemainingMs)})` : ''}
        </p>
      </div>

      {!isDutyActive ? (
        <Button
          type="button"
          size="sm"
          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          onClick={() => void startDuty()}
        >
          <Play className="h-3.5 w-3.5 mr-1" />
          Estou trabalhando
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          {!isPaused ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" className="h-8 font-semibold">
                  <Pause className="h-3.5 w-3.5 mr-1" />
                  Pausar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Duração da pausa</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PAUSE_OPTIONS.map((opt) => (
                  <DropdownMenuItem key={opt.minutes} onClick={() => void startPause(opt.minutes)}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-amber-500 text-amber-800 hover:bg-amber-50 font-semibold"
              onClick={() => void cancelPause()}
            >
              Encerrar pausa
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 font-semibold"
            onClick={() => void stopDuty()}
          >
            <Square className="h-3.5 w-3.5 mr-1" />
            Parar
          </Button>
        </div>
      )}
    </div>
  );
}
