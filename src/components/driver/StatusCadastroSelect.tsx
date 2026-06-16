import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { STATUS_CADASTRO_OPTIONS, getStatusCadastroBadgeColor } from '@/components/driver/driver-status-constants';

interface StatusCadastroSelectProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export function StatusCadastroSelect({ value, onChange, className }: StatusCadastroSelectProps) {
  const handleChange = (next: string) => {
    onChange(next);
  };

  return (
    <Select value={value || '_empty_'} onValueChange={handleChange}>
      <SelectTrigger className={`max-w-[55%] h-8 text-sm ml-auto ${className || ''}`}>
        <SelectValue placeholder="Selecione o status" />
      </SelectTrigger>
      <SelectContent className="z-[9999]">
        {STATUS_CADASTRO_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${opt.color.replace('hover:', '').split(' ')[0]}`} />
              {opt.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StatusCadastroBadge({ status }: { status?: string | null }) {
  const label = status?.trim() || '(vazio)';
  return (
    <Badge className={`${getStatusCadastroBadgeColor(status)} text-xs border-transparent shadow-sm`} variant="outline">
      {label}
    </Badge>
  );
}
