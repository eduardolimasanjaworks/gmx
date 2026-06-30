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

export function parseCnhOcrData(text: string, currentForm: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  const textNumerico = text.replace(/[oO](?=\d)|(?<=\d)[oO]/g, '0');
  const norm = textNumerico.replace(/\s+/g, ' ').toUpperCase();
  const cleanNumbers = text.replace(/[^\d]/g, '');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const dateRegex = /\b(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{4})\b/g;
  const allDates: Array<{ str: string; ts: number }> = [];
  let match;
  const textForDates = textNumerico.replace(/(\d)\s+([\/.])\s+(\d)/g, '$1$2$3');
  while ((match = dateRegex.exec(textForDates)) !== null) {
    const d = parseInt(match[1], 10), m = parseInt(match[2], 10), y = parseInt(match[3], 10);
    const ts = new Date(y, m - 1, d).getTime();
    if (ts > new Date(1940, 0, 1).getTime() && ts < new Date(2100, 0, 1).getTime()) {
      allDates.push({ str: `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`, ts });
    }
  }
  const uniqueDates = Array.from(new Map(allDates.map((item) => [item.ts, item])).values());
  uniqueDates.sort((a, b) => a.ts - b.ts);
  const now = Date.now();
  const past = uniqueDates.filter((d) => d.ts <= now);
  const future = uniqueDates.filter((d) => d.ts > now);

  if (!currentForm.validade && future.length > 0) updates.validade = future[future.length - 1].str;
  if (past.length >= 3) {
    if (!currentForm.data_nasc) updates.data_nasc = past[0].str;
    if (!currentForm.primeira_habilitacao) updates.primeira_habilitacao = past[1].str;
    if (!currentForm.emissao_cnh) updates.emissao_cnh = past[past.length - 1].str;
  } else if (past.length === 2) {
    if (!currentForm.data_nasc) updates.data_nasc = past[0].str;
    if (!currentForm.emissao_cnh) updates.emissao_cnh = past[1].str;
  } else if (past.length === 1) {
    if (!currentForm.emissao_cnh) updates.emissao_cnh = past[0].str;
  }

  if (!currentForm.cpf) {
    const cpfMatch = norm.match(/\d{3}\s*[\.\s]?\s*\d{3}\s*[\.\s]?\s*\d{3}\s*[-\s]?\s*\d{2}/);
    if (cpfMatch) { updates.cpf = cpfMatch[0].replace(/[^\d]/g, ''); }
    else { const poss = cleanNumbers.match(/\d{11}/g) || []; if (poss.length > 0) updates.cpf = poss[0]; }
  }

  if (!currentForm.categoria) {
    const catCtx = norm.match(/(?:CAT\.?\s*HAB|HABILITA[CÇ][AÃ]O|CATEGORIA|CAT)[^\n]{0,40}?\b(AB|AC|AD|AE|A|B|C|D|E)\b/);
    if (catCtx) { updates.categoria = catCtx[1]; }
    else {
      const m2 = norm.match(/\b(AB|AC|AD|AE)\b/g);
      if (m2) { updates.categoria = m2[0]; }
      else {
        const IGNORE = new Set(['DE', 'DA', 'DO', 'AS', 'OS', 'SE', 'EM', 'AO', 'A', 'E', 'O']);
        const hc = norm.replace(/DRIVER LICENSE|PERMISO DE CONDUCCION|CARTEIRA NACIONAL|REPUBLICA|FEDERATIVA|MINISTERIO|TRANSITO/g, '');
        const m1 = hc.match(/\b(A|B|C|D|E)\b/g);
        if (m1) { const cat = m1.find((c) => !IGNORE.has(c) || ['A','B','C','D','E'].includes(c)); if (cat) updates.categoria = cat; }
      }
    }
  }

  if (!currentForm.n_registro_cnh) {
    const cpfD = String(updates.cpf || currentForm.cpf || '');
    const reg = (cleanNumbers.match(/\d{11}/g) || []).find((n) => n !== cpfD);
    if (reg) updates.n_registro_cnh = reg;
  }

  if (!currentForm.n_formulario_cnh) {
    const cpfD = String(updates.cpf || currentForm.cpf || '');
    const regD = String(updates.n_registro_cnh || currentForm.n_registro_cnh || '');
    const form = (cleanNumbers.match(/\d{9,12}/g) || []).find((n) => n !== cpfD && n !== regD && !n.startsWith('0000'));
    if (form) updates.n_formulario_cnh = form;
  }

  if (!currentForm.n_cnh_renach) {
    const rr = norm.replace(/\s+/g, '');
    const rm = rr.match(/([A-Z]{2})([0-9OISBZ]{9})/);
    if (rm) updates.n_cnh_renach = rm[1] + rm[2].replace(/[O]/g, '0').replace(/[I]/g, '1').replace(/[S]/g, '5').replace(/[B]/g, '8').replace(/[Z]/g, '2');
  }

  if (!currentForm.nome_mae) {
    const fi = lines.findIndex((l) => /FILIA[CÇ][AÃ]O|FIA[CÇ][AÃ]O|M[AÃ]E/i.test(l));
    if (fi !== -1) {
      const pls = lines.slice(fi + 1, fi + 5).map((l) => l.replace(/[^a-zA-ZÀ-ú\s]/g, '').trim()).filter((l) => l.length > 5).map((l) => l.replace(/^(?:[a-zA-Z]{1,2}\s+)+/, '').trim());
      if (pls.length >= 2) updates.nome_mae = pls[1]; else if (pls.length === 1) updates.nome_mae = pls[0];
    }
  }

  return { ...currentForm, ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== null && v !== '')), observacao: currentForm.observacao ? `${currentForm.observacao}\n\n[OCR]: ${text}` : `[OCR]: ${text}` };
}

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
