/**
 * @module operational-dashboard/components/operational/StatusCheckboxFilters
 * @purpose Checkboxes locais de status para a pizza.
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PIE_STATUS_KEYS, PIE_STATUS_LABELS } from '../../constants/status-labels';
import { emptyMeansAll } from '../../utils/filter-normalize';

interface StatusCheckboxFiltersProps {
  selected: string[];
  onToggle: (status: string) => void;
}

export function StatusCheckboxFilters({ selected, onToggle }: StatusCheckboxFiltersProps) {
  const effective = emptyMeansAll(selected, [...PIE_STATUS_KEYS]);

  return (
    <div className="flex flex-wrap gap-4">
      {PIE_STATUS_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <Checkbox
            id={`pie-${key}`}
            checked={effective.includes(key)}
            onCheckedChange={() => onToggle(key)}
          />
          <Label htmlFor={`pie-${key}`} className="cursor-pointer text-sm">
            {PIE_STATUS_LABELS[key]}
          </Label>
        </div>
      ))}
    </div>
  );
}
