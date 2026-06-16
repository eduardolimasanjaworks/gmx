import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TIPO_CARROCERIA_OPTIONS } from '@/components/driver/driver-profile-constants';

const STORAGE_KEY = 'gmx_tipo_carroceria_custom';

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

export function useTipoCarroceriaOptions(extraValues: string[] = []) {
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
    if (!name) return { ok: false as const, error: 'Informe um nome.' };

    const exists =
      DEFAULT_TIPO_CARROCERIA_OPTIONS.some((opt) => opt.toLowerCase() === name.toLowerCase()) ||
      customOptions.some((opt) => opt.toLowerCase() === name.toLowerCase());

    if (exists) return { ok: false as const, error: 'Esse tipo já existe.' };

    persist([...customOptions, name]);
    return { ok: true as const, value: name };
  }, [customOptions, persist]);

  const updateOption = useCallback((oldName: string, rawNewName: string) => {
    const newName = normalizeLabel(rawNewName);
    if (!newName) return { ok: false as const, error: 'Informe um nome.' };

    const index = customOptions.findIndex((opt) => opt === oldName);
    if (index === -1) return { ok: false as const, error: 'Tipo personalizado não encontrado.' };

    const duplicate =
      DEFAULT_TIPO_CARROCERIA_OPTIONS.some((opt) => opt.toLowerCase() === newName.toLowerCase()) ||
      customOptions.some((opt, i) => i !== index && opt.toLowerCase() === newName.toLowerCase());

    if (duplicate) return { ok: false as const, error: 'Esse tipo já existe.' };

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
      ...DEFAULT_TIPO_CARROCERIA_OPTIONS,
      ...customOptions,
      ...extraValues.filter(Boolean),
    ];
    return [...new Set(merged)];
  }, [customOptions, extraValues]);

  return {
    defaultOptions: DEFAULT_TIPO_CARROCERIA_OPTIONS,
    customOptions,
    allOptions,
    addOption,
    updateOption,
    removeOption,
  };
}
