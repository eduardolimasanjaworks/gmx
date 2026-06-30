import React, { useState } from 'react';
import { format, parse, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { directusUrl } from '@/lib/directus';

export const ADMIN_TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

export const parseDateBR = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null;
  const str = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.split('T')[0].split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  try {
    const parsed = parse(str, 'dd/MM/yyyy', new Date());
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch { return null; }
};

export const formatDateForAPI = (dateStr: unknown): unknown => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const d = parseDateBR(dateStr);
  if (d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return dateStr;
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  try {
    const d = parseDateBR(dateStr);
    if (d) return format(d, 'dd/MM/yyyy', { locale: ptBR });
    return String(dateStr);
  } catch { return String(dateStr); }
};

export const getCnhStatus = (dateStr: string): string | null => {
  const d = parseDateBR(dateStr);
  if (!d) return null;
  const today = startOfDay(new Date());
  return isBefore(d, today) ? 'Expirado' : 'No Prazo';
};

export const normalizeOperationToken = (value: unknown): string =>
  String(value ?? '').trim().toUpperCase();

export const parseEligibleOperations = (value: unknown): string[] =>
  Array.from(new Set(
    String(value ?? '').split(/[;,/|]/g).map(normalizeOperationToken).filter(Boolean),
  ));

export const getAuthenticatedUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (url.includes('googleapis.com') || url.includes('base64')) return url;
  if (url.includes(directusUrl) && !url.includes('access_token')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}access_token=${ADMIN_TOKEN}`;
  }
  return url;
};

export const parseNumberOrUndefined = (val: unknown): number | undefined => {
  if (val === null || val === undefined) return undefined;
  const str = String(val).trim();
  if (!str) return undefined;
  const num = Number(str.replace(',', '.'));
  return Number.isFinite(num) ? num : undefined;
};

export function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 h-9">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className={`font-medium text-sm text-right truncate max-w-[200px] ${!value ? 'text-muted-foreground/40' : ''}`}>
        {String(value || '-')}
      </span>
    </div>
  );
}

export function InputField({ label, value, onChange, type = 'text', numeric = false, isDate = false }: {
  label: string; value: unknown; onChange: (v: string) => void;
  type?: string; numeric?: boolean; isDate?: boolean;
}) {
  const [error, setError] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newVal = e.target.value;
    if (isDate) {
      let v = newVal.replace(/\D/g, '');
      if (v.length > 8) v = v.substring(0, 8);
      if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
      else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)/, '$1/$2');
      onChange(v); return;
    }
    if (numeric) {
      if (newVal === '') { onChange(''); setError(''); return; }
      if (/^\d+$/.test(newVal)) { onChange(newVal); setError(''); }
      else { setError('Apenas números são permitidos'); }
    } else { onChange(newVal); }
  };
  return (
    <div className="flex flex-col space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input type={type} value={String(value || '')} onChange={handleChange}
        className={error ? 'border-red-500 focus-visible:ring-red-500' : ''} />
      {error && <span className="text-xs text-red-500 font-medium animate-pulse">{error}</span>}
    </div>
  );
}

export function CpfInputField({ label, value, onChange, referenceCpf }: {
  label: string; value: unknown; onChange: (v: string) => void; referenceCpf?: string;
}) {
  const [error, setError] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    if (newVal === '') { onChange(''); setError(''); return; }
    setError(''); onChange(newVal);
  };
  const isValid = referenceCpf && value === referenceCpf;
  const isInvalid = referenceCpf && value && value !== referenceCpf;
  return (
    <div className="flex flex-col space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input type="text" value={String(value || '')} onChange={handleChange}
        className={error || isInvalid ? 'border-red-500 focus-visible:ring-red-500' : isValid ? 'border-green-500 focus-visible:ring-green-500' : ''}
        placeholder={referenceCpf || 'Digite o CPF'} />
      {error && <span className="text-xs text-red-500 font-medium animate-pulse">{error}</span>}
      {!error && isInvalid && <span className="text-xs text-red-500 font-medium animate-pulse">❌ CPF deve ser igual ao cadastrado: {referenceCpf}</span>}
      {!error && isValid && <span className="text-xs text-green-600 font-medium">✅ CPF confirmado</span>}
    </div>
  );
}
