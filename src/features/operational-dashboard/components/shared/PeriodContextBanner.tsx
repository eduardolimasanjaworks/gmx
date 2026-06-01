/**
 * @module operational-dashboard/components/shared/PeriodContextBanner
 * @purpose Contexto de período em linguagem de negócio.
 */

import { CalendarRange } from 'lucide-react';

interface PeriodContextBannerProps {
  label: string;
  hint?: string;
}

export function PeriodContextBanner({ label, hint }: PeriodContextBannerProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
      <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="font-medium text-foreground">Período analisado</p>
        <p className="text-muted-foreground">{label}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
