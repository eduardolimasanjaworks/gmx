import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CNH_VALIDADE_STATUS_OPTIONS } from '@/components/driver/driver-status-constants';

const STORAGE_KEY = 'gmx_cnh_validade_status_custom';

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function loadCustomOptions(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

function persistCustomOptions(options: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
}

export function useCnhValidadeStatusOptions(extraValues: string[] = []) {
  const [customOptions, setCustomOptions] = useState<string[]>(loadCustomOptions);

  useEffect(() => {
    setCustomOptions(loadCustomOptions());
  }, []);

  const persist = useCallback((next: string[]) => {
    const unique = [...new Set(next.map(normalizeLabel).filter(Boolean))];
    persistCustomOptions(unique);
    setCustomOptions(unique);
    return unique;
  }, []);

  const addOption = useCallback((rawName: string) => {
    const name = normalizeLabel(rawName);
    if (!name) return { ok: false as const, error: 'Informe um status.' };

    const exists =
      DEFAULT_CNH_VALIDADE_STATUS_OPTIONS.some((opt) => opt.toLowerCase() === name.toLowerCase()) ||
      customOptions.some((opt) => opt.toLowerCase() === name.toLowerCase());

    if (exists) return { ok: false as const, error: 'Esse status já existe.' };

    persist([...customOptions, name]);
    return { ok: true as const, value: name };
  }, [customOptions, persist]);

  const updateOption = useCallback((oldName: string, rawNewName: string) => {
    const newName = normalizeLabel(rawNewName);
    if (!newName) return { ok: false as const, error: 'Informe um status.' };

    const index = customOptions.findIndex((opt) => opt === oldName);
    if (index === -1) return { ok: false as const, error: 'Status personalizado não encontrado.' };

    const duplicate =
      DEFAULT_CNH_VALIDADE_STATUS_OPTIONS.some((opt) => opt.toLowerCase() === newName.toLowerCase()) ||
      customOptions.some((opt, i) => i !== index && opt.toLowerCase() === newName.toLowerCase());

    if (duplicate) return { ok: false as const, error: 'Esse status já existe.' };

    const next = [...customOptions];
    next[index] = newName;
    persist(next);
    return { ok: true as const, value: newName };
  }, [customOptions, persist]);

  const removeOption = useCallback((name: string) => {
    persist(customOptions.filter((opt) => opt !== name));
    return { ok: true as const };
  }, [customOptions, persist]);

  const allOptions = useMemo(() => {
    const merged = [
      ...DEFAULT_CNH_VALIDADE_STATUS_OPTIONS,
      ...customOptions,
      ...extraValues.filter(Boolean),
    ];
    return [...new Set(merged)];
  }, [customOptions, extraValues]);

  return {
    defaultOptions: DEFAULT_CNH_VALIDADE_STATUS_OPTIONS,
    customOptions,
    allOptions,
    addOption,
    updateOption,
    removeOption,
  };
}
