/**
 * @module operational-dashboard/components/operational/StatusCheckboxFilters
 * @purpose Checkboxes de status no painel lateral (gráfico de pizza).
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PIE_STATUS_COLORS, PIE_STATUS_KEYS, PIE_STATUS_LABELS } from '../../constants/status-labels';
import { emptyMeansAll } from '../../utils/filter-normalize';

interface StatusCheckboxFiltersProps {
  selected: string[];
  onToggle: (status: string) => void;
}

export function StatusCheckboxFilters({ selected, onToggle }: StatusCheckboxFiltersProps) {
  const effective = emptyMeansAll(selected, [...PIE_STATUS_KEYS]);

  return (
    <div className="rounded-lg border-2 border-slate-400 bg-white p-3 shadow-sm">
      <p className="mb-3 text-sm font-bold uppercase text-slate-900">Status</p>
      <div className="space-y-2">
        {PIE_STATUS_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-slate-600"
              style={{ backgroundColor: PIE_STATUS_COLORS[key] }}
            />
            <Checkbox
              id={`pie-${key}`}
              checked={effective.includes(key)}
              onCheckedChange={() => onToggle(key)}
            />
            <Label htmlFor={`pie-${key}`} className="cursor-pointer text-sm font-medium text-slate-900">
              {PIE_STATUS_LABELS[key].toUpperCase()}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
