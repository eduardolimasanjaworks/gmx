import { Badge } from '@/components/ui/badge';
import {
  deriveCnhValidadeStatus,
  formatRegistryDate,
  getCnhValidadeStatusBadgeColor,
  getStatusCadastroBadgeColor,
  getVencimentoCxBadgeColor,
} from '@/components/driver/driver-status-constants';

export const REGISTRY_CONTROL_FIELDS = [
  'status_validade_cnh',
  'status_cadastro',
  'vencimento_cx',
  'observacao',
  'ia_atendimento',
] as const;

export function enrichDriverRegistryRow(driver: any, cnhMap: Record<number, any>) {
  const cnh = cnhMap[driver.id];
  const statusValidade = deriveCnhValidadeStatus(
    cnh?.validade,
    driver.status_validade_cnh,
  );

  return {
    ...driver,
    nome_completo: `${driver.nome || ''} ${driver.sobrenome || ''}`.trim(),
    cnh_validade: cnh?.validade || null,
    status_validade_cnh: statusValidade,
  };
}

export function renderRegistryControlCell(fieldName: string, driver: any) {
  switch (fieldName) {
    case 'status_validade_cnh': {
      const label = driver.status_validade_cnh || '-';
      if (label === '-') return <span className="text-muted-foreground">-</span>;
      return (
        <Badge className={`${getCnhValidadeStatusBadgeColor(label)} text-xs border-transparent whitespace-nowrap`}>
          {label}
        </Badge>
      );
    }
    case 'status_cadastro': {
      const label = driver.status_cadastro || '(vazio)';
      return (
        <Badge className={`${getStatusCadastroBadgeColor(driver.status_cadastro)} text-xs border-transparent whitespace-nowrap`}>
          {label}
        </Badge>
      );
    }
    case 'vencimento_cx': {
      const formatted = formatRegistryDate(driver.vencimento_cx);
      if (formatted === '-') return <span className="text-muted-foreground">-</span>;
      return (
        <Badge className={`${getVencimentoCxBadgeColor(driver.vencimento_cx)} text-xs border-transparent whitespace-nowrap`}>
          {formatted}
        </Badge>
      );
    }
    case 'observacao': {
      const text = driver.observacao?.trim();
      if (!text) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-sm line-clamp-2 max-w-[220px]" title={text}>
          {text}
        </span>
      );
    }
    case 'ia_atendimento': {
      const pausada = driver.ia_pausada === true;
      const precisa = driver.precisa_atendimento === true;
      if (!pausada && !precisa) {
        return <Badge className="bg-green-600 text-xs">IA ativa</Badge>;
      }
      return (
        <div className="flex flex-col gap-1">
          {precisa && (
            <Badge className="bg-orange-500 hover:bg-orange-500 text-xs whitespace-nowrap">Precisa atendimento</Badge>
          )}
          {pausada && (
            <Badge variant="destructive" className="text-xs whitespace-nowrap">IA pausada</Badge>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
