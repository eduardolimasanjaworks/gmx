export const STATUS_CADASTRO_OPTIONS = [
  { value: 'CONTATO WHATSAPP', label: 'CONTATO WHATSAPP', color: 'bg-sky-500 hover:bg-sky-500 text-white' },
  { value: 'NAO MOTORISTA', label: 'NAO MOTORISTA', color: 'bg-slate-500 hover:bg-slate-500 text-white' },
  { value: 'BLOQUEADO', label: 'BLOQUEADO', color: 'bg-red-600 hover:bg-red-600 text-white' },
  { value: 'CADASTRADO', label: 'CADASTRADO', color: 'bg-green-600 hover:bg-green-600 text-white' },
  { value: 'FALTA DOCS', label: 'FALTA DOCS', color: 'bg-yellow-500 hover:bg-yellow-500 text-black' },
  { value: 'NECESSARIO ATUALIZAR', label: 'NECESSARIO ATUALIZAR', color: 'bg-orange-500 hover:bg-orange-500 text-black' },
  { value: 'REPROVADO', label: 'REPROVADO', color: 'bg-red-700 hover:bg-red-700 text-white' },
  { value: 'INATIVO', label: 'INATIVO', color: 'bg-gray-500 hover:bg-gray-500 text-white' },
  { value: '_empty_', label: '(vazio)', color: 'bg-gray-300 text-black hover:bg-gray-300' },
] as const;

export const DEFAULT_CNH_VALIDADE_STATUS_OPTIONS = [
  'CNH NO PRAZO',
  'CNH EXPIRADA',
  'CNH A VENCER',
] as const;

export const CNH_VALIDADE_STATUS_COLORS: Record<string, string> = {
  'CNH NO PRAZO': 'bg-green-600 hover:bg-green-600 text-white',
  'CNH EXPIRADA': 'bg-red-600 hover:bg-red-600 text-white',
  'CNH A VENCER': 'bg-yellow-500 hover:bg-yellow-500 text-black',
};

export function getStatusCadastroBadgeColor(status?: string | null) {
  if (!status || status === '_empty_') {
    return STATUS_CADASTRO_OPTIONS.find((x) => x.value === '_empty_')?.color ?? 'bg-gray-300 text-black';
  }
  const match = STATUS_CADASTRO_OPTIONS.find(
    (x) => x.value === status.toUpperCase() || x.label === status.toUpperCase(),
  );
  return match?.color ?? 'bg-secondary text-secondary-foreground';
}

export function getCnhValidadeStatusBadgeColor(status?: string | null) {
  if (!status) return 'bg-gray-300 text-black';
  const upper = status.toUpperCase();
  if (CNH_VALIDADE_STATUS_COLORS[status]) return CNH_VALIDADE_STATUS_COLORS[status];
  if (upper.includes('PRAZO') || upper.includes('VÁLID')) return CNH_VALIDADE_STATUS_COLORS['CNH NO PRAZO'];
  if (upper.includes('EXPIR') || upper.includes('VENCID')) return CNH_VALIDADE_STATUS_COLORS['CNH EXPIRADA'];
  if (upper.includes('VENCER')) return CNH_VALIDADE_STATUS_COLORS['CNH A VENCER'];
  return 'bg-blue-600 hover:bg-blue-600 text-white';
}

export function getVencimentoCxBadgeColor(dateStr?: string | null) {
  if (!dateStr) return 'bg-gray-300 text-black';
  const d = parseDateValue(dateStr);
  if (!d) return 'bg-secondary text-secondary-foreground';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return 'bg-red-600 hover:bg-red-600 text-white';
  return 'bg-green-600 hover:bg-green-600 text-white';
}

function parseDateValue(dateStr: string) {
  const str = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.split('T')[0].split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRegistryDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  const d = parseDateValue(String(dateStr));
  if (!d) return String(dateStr);
  return d.toLocaleDateString('pt-BR');
}

export function deriveCnhValidadeStatus(validadeDate?: string | null, stored?: string | null) {
  if (stored?.trim()) return stored.trim();
  const d = validadeDate ? parseDateValue(String(validadeDate)) : null;
  if (!d) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return 'CNH EXPIRADA';
  const in90Days = new Date(today);
  in90Days.setDate(in90Days.getDate() + 90);
  if (d <= in90Days) return 'CNH A VENCER';
  return 'CNH NO PRAZO';
}
