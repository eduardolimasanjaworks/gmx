import { Clock3, Loader2, Search, Send, ShieldCheck, ShieldX, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FiltrosTabela } from './useContatoProativoFila';

interface Props {
  totalItens: number;
  totalSelecionados: number;
  totalEmCarga: number;
  totalPadrao: number;
  filtros: FiltrosTabela;
  onFiltros: (f: FiltrosTabela) => void;
  diasAdiar: number;
  onDiasAdiar: (n: number) => void;
  intervaloSegundos: number;
  onIntervalo: (n: number) => void;
  busy: string | null;
  haPendentesSelecionados: boolean;
  haAprovadosSelecionados: boolean;
  haSelecionadosAdiaveis: boolean;
  todosSelecionados: boolean;
  onToggleTodos: (checked: boolean) => void;
  onAprovar: () => void;
  onAdiar: () => void;
  onDisparar: () => void;
  onAprovarEDisparar: () => void;
}

export function FilaAcoesToolbar({
  totalItens, totalSelecionados, totalEmCarga, totalPadrao,
  filtros, onFiltros, diasAdiar, onDiasAdiar,
  intervaloSegundos, onIntervalo, busy,
  haPendentesSelecionados, haAprovadosSelecionados, haSelecionadosAdiaveis,
  todosSelecionados, onToggleTodos,
  onAprovar, onAdiar, onDisparar, onAprovarEDisparar,
}: Props) {
  const set = (key: keyof FiltrosTabela, val: unknown) =>
    onFiltros({ ...filtros, [key]: val });

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={todosSelecionados}
            onCheckedChange={(c) => onToggleTodos(c === true)}
            aria-label="Selecionar todos"
          />
          <div className="text-sm">
            <span className="font-medium">{totalSelecionados} selecionado(s)</span>
            <span className="ml-2 text-muted-foreground text-xs">
              de {totalItens} ({totalEmCarga} em carga · {totalPadrao} disponivel)
            </span>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <div className="relative w-48">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar motorista..."
              value={filtros.busca}
              onChange={(e) => set('busca', e.target.value)}
              className="pl-7 h-9 text-sm"
            />
          </div>

          <select
            value={filtros.categoria}
            onChange={(e) => set('categoria', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="diario">Em carga (diario)</option>
            <option value="padrao">Disponivel (padrao)</option>
          </select>

          <div className="flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Top</Label>
            <Input
              type="number"
              min={1}
              max={2000}
              value={filtros.topX}
              onChange={(e) => set('topX', Math.max(1, Number(e.target.value)))}
              className="w-16 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t pt-3">
        <div className="flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground">Intervalo (seg)</Label>
          <Input
            type="number"
            min={0}
            step={5}
            value={intervaloSegundos}
            onChange={(e) => onIntervalo(Math.max(0, Number(e.target.value)))}
            className="w-20 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-1">
          <ShieldX className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground">Adiar (dias)</Label>
          <Input
            type="number"
            min={1}
            value={diasAdiar}
            onChange={(e) => onDiasAdiar(Math.max(1, Number(e.target.value)))}
            className="w-16 h-9 text-sm"
          />
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onAprovar}
            disabled={!haPendentesSelecionados || !!busy} className="gap-1">
            {busy === 'aprovar-lote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Liberar
          </Button>
          <Button variant="outline" size="sm" onClick={onAdiar}
            disabled={!haSelecionadosAdiaveis || !!busy} className="gap-1">
            {busy === 'adiar-lote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
            Adiar {diasAdiar}d
          </Button>
          <Button variant="outline" size="sm" onClick={onDisparar}
            disabled={!haAprovadosSelecionados || !!busy} className="gap-1">
            {busy === 'disparar-lote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar pergunta
          </Button>
          <Button size="sm" onClick={onAprovarEDisparar}
            disabled={!totalSelecionados || !!busy} className="gap-1">
            {busy === 'aprovar-disparar-lote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Liberar e enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
