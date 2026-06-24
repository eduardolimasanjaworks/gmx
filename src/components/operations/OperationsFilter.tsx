import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTiposOperacao } from '@/hooks/useTiposOperacao';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperationsFilterProps {
  value: string[];
  onChange: (operations: string[]) => void;
  className?: string;
}

function normalizeOperationName(value: string): string {
  return value.trim().toUpperCase();
}

export function OperationsFilter({ value, onChange, className }: OperationsFilterProps) {
  const { tipos, isLoading, createTipo, deleteTipo } = useTiposOperacao();
  const [novoTipo, setNovoTipo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<number | null>(null);

  const tiposAtivos = useMemo(
    () =>
      (tipos ?? [])
        .filter((t) => t.ativo !== false)
        .map((t) => ({ ...t, nome: normalizeOperationName(t.nome) })),
    [tipos],
  );

  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (tiposAtivos.length === 0) return;
    if (!hasInitialized) {
      if (value.length === 0) {
        onChange(tiposAtivos.map((t) => t.nome));
      }
      setHasInitialized(true);
    }
  }, [tiposAtivos, hasInitialized, value.length, onChange]);

  const toggleTipo = (nome: string) => {
    const normalized = normalizeOperationName(nome);
    if (value.includes(normalized)) {
      onChange(value.filter((v) => normalizeOperationName(v) !== normalized));
      return;
    }
    onChange([...value, normalized]);
  };

  const selecionarTodas = () => {
    onChange(tiposAtivos.map((t) => t.nome));
  };

  const limparSelecao = () => {
    onChange([]);
  };

  const adicionarOperacao = async () => {
    const nome = normalizeOperationName(novoTipo);
    if (!nome) return;
    setSalvando(true);
    try {
      await createTipo(nome);
      setNovoTipo('');
      onChange([...new Set([...value, nome])]);
    } finally {
      setSalvando(false);
    }
  };

  const excluirOperacao = async (id: number) => {
    setRemovendoId(id);
    try {
      const item = tiposAtivos.find((t) => t.id === id);
      await deleteTipo(id);
      if (item) {
        onChange(value.filter((v) => normalizeOperationName(v) !== item.nome));
      }
    } finally {
      setRemovendoId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('w-[220px] justify-between', className)}>
          <span className="truncate">Operações</span>
          <span className="text-xs text-muted-foreground">{value.length}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Filtrar operações</span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={selecionarTodas}>
              Todas
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={limparSelecao}>
              Limpar
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-56 space-y-1 overflow-y-auto px-2 py-1">
          {isLoading ? (
            <p className="p-2 text-xs text-muted-foreground">Carregando operações...</p>
          ) : tiposAtivos.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">Nenhuma operação cadastrada.</p>
          ) : (
            tiposAtivos.map((tipo) => {
              const checked = value.includes(tipo.nome);
              return (
                <div key={tipo.id} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted/70">
                  <button
                    type="button"
                    onClick={() => toggleTipo(tipo.nome)}
                    className="flex flex-1 items-center gap-2 text-left text-sm"
                  >
                    <Checkbox checked={checked} />
                    <span>{tipo.nome}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => excluirOperacao(tipo.id)}
                    disabled={removendoId === tipo.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-2 p-2">
          <Input
            placeholder="Nova operação (ex: ARROZ)"
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void adicionarOperacao()}
            className="h-8"
          />
          <Button
            type="button"
            size="icon"
            className="h-8 w-8"
            onClick={() => void adicionarOperacao()}
            disabled={salvando || !novoTipo.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
