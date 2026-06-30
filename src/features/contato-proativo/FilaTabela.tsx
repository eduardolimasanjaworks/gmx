import { ArrowUpDown, Send, ShieldCheck, ShieldX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ContatoProativoItem } from '@/services/iagmxContatoProativoService';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  aprovado: 'default', disparado: 'secondary', adiado: 'outline',
  rejeitado: 'destructive', pendente: 'outline',
};
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Aguardando', aprovado: 'Liberado', disparado: 'Enviado',
  adiado: 'Adiado', rejeitado: 'Fora da fila',
};

type Coluna = 'prioridade_score' | 'horas_sem_posicao' | 'ultima_abordagem_em' | 'nome';
type Direcao = 'asc' | 'desc';

function fmtHoras(v: number | null) {
  if (v == null) return '—';
  if (v < 24) return `${Math.round(v)}h`;
  return `${Math.round(v / 24)}d`;
}

function fmtData(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  itens: ContatoProativoItem[];
  selectedIds: number[];
  busy: string | null;
  onToggleItem: (id: number, checked: boolean) => void;
  onToggleTodos: (checked: boolean) => void;
  onAprovar: (id: number) => void;
  onAdiar: (id: number) => void;
  onDisparar: (id: number) => void;
}

export function FilaTabela({
  itens, selectedIds, busy, onToggleItem, onToggleTodos, onAprovar, onAdiar, onDisparar,
}: Props) {
  const [sortCol, setSortCol] = useState<Coluna>('prioridade_score');
  const [sortDir, setSortDir] = useState<Direcao>('desc');

  const toggleSort = (col: Coluna) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const itensSorted = useMemo(() => {
    return [...itens].sort((a, b) => {
      let va: number, vb: number;
      if (sortCol === 'nome') {
        return sortDir === 'asc'
          ? (a.nome ?? '').localeCompare(b.nome ?? '')
          : (b.nome ?? '').localeCompare(a.nome ?? '');
      }
      if (sortCol === 'ultima_abordagem_em') {
        va = a.ultima_abordagem_em ? new Date(a.ultima_abordagem_em).getTime() : 0;
        vb = b.ultima_abordagem_em ? new Date(b.ultima_abordagem_em).getTime() : 0;
      } else {
        va = Number(a[sortCol] ?? 0);
        vb = Number(b[sortCol] ?? 0);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [itens, sortCol, sortDir]);

  const todosSelecionados = itens.length > 0 && selectedIds.length === itens.length;

  function SortBtn({ col, label }: { col: Coluna; label: string }) {
    return (
      <button type="button" onClick={() => toggleSort(col)}
        className="flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    );
  }

  if (!itens.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum motorista na fila com os filtros atuais.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox checked={todosSelecionados}
                onCheckedChange={(c) => onToggleTodos(c === true)}
                aria-label="Selecionar todos" />
            </TableHead>
            <TableHead className="w-[32px] text-center">#</TableHead>
            <TableHead><SortBtn col="nome" label="Motorista" /></TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead><SortBtn col="horas_sem_posicao" label="Sem localizacao" /></TableHead>
            <TableHead><SortBtn col="ultima_abordagem_em" label="Ultima abordagem GMX" /></TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itensSorted.map((item, idx) => {
            const chaveApr = `aprovar-${item.id}`;
            const chaveAdiar = `adiar-${item.id}`;
            const chaveDisp = `disparar-${item.id}`;
            return (
              <TableRow key={item.id} data-state={selectedIds.includes(item.id) ? 'selected' : undefined}>
                <TableCell>
                  <Checkbox checked={selectedIds.includes(item.id)}
                    onCheckedChange={(c) => onToggleItem(item.id, c === true)}
                    aria-label={`Selecionar ${item.nome ?? item.id}`} />
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{item.nome ?? `Motorista ${item.motorista_id}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {[item.cidade, item.estado].filter(Boolean).join(' / ') || '—'}
                    {item.operacao ? ` | ${item.operacao}` : ''}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{item.telefone}</TableCell>
                <TableCell>
                  {item.em_carga
                    ? <Badge variant="default" className="bg-orange-500 text-white">Em carga</Badge>
                    : <Badge variant="outline">Disponivel</Badge>}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{fmtHoras(item.horas_sem_posicao)}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {item.localizacao_atual ?? 'sem posicao'}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{fmtData(item.ultima_abordagem_em)}</div>
                  {item.adiar_ate && (
                    <div className="text-xs text-muted-foreground">ate {fmtData(item.adiar_ate)}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[item.status_item] ?? 'outline'}>
                    {STATUS_LABEL[item.status_item] ?? item.status_item}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline"
                      onClick={() => onAprovar(item.id)}
                      disabled={!!busy || item.status_item === 'disparado'}
                      className="gap-1 px-2">
                      {busy === chaveApr ? '...' : <ShieldCheck className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => onAdiar(item.id)}
                      disabled={!!busy || item.status_item === 'disparado'}
                      className="gap-1 px-2">
                      {busy === chaveAdiar ? '...' : <ShieldX className="h-4 w-4" />}
                    </Button>
                    <Button size="sm"
                      onClick={() => onDisparar(item.id)}
                      disabled={!!busy || item.status_item !== 'aprovado'}
                      className="gap-1 px-2">
                      {busy === chaveDisp ? '...' : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
