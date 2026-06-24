/**
 * Painel operacional da fila humana de ofertas.
 * Expõe casos escalados com ações explícitas de assumir e resolver.
 * A tela fecha o ciclo entre WhatsApp, IAGMX e quadro de embarques.
 */
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIagmxFilaHumanaOfertas } from '@/hooks/useIagmxFilaHumanaOfertas';

const OPCOES_RESOLUCAO = [
  { value: 'acordo_manual', label: 'Acordo manual' },
  { value: 'sem_acordo', label: 'Sem acordo' },
  { value: 'redistribuido', label: 'Redistribuido' },
];

function moeda(value?: number | null): string {
  if (!Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function OfertaFilaHumanaPanel() {
  const { itens, isLoading, isRefetching, assumirCaso, resolverCaso, isSaving } =
    useIagmxFilaHumanaOfertas();
  const [owners, setOwners] = useState<Record<number, string>>({});
  const [observacoes, setObservacoes] = useState<Record<number, string>>({});
  const [resolucoes, setResolucoes] = useState<Record<number, string>>({});

  const pendentes = useMemo(
    () => itens.filter((item) => item.status === 'pendente' || item.status === 'assumido'),
    [itens],
  );

  if (!isLoading && pendentes.length === 0) return null;

  return (
    <Card className="border-amber-300/70 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Fila humana de ofertas
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Casos que bateram no teto, ficaram ambiguos ou exigem decisao operacional.
          </p>
        </div>
        <Badge variant="outline">
          {isRefetching ? 'Atualizando...' : `${pendentes.length} caso(s)`}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando fila humana...
          </div>
        ) : (
          pendentes.map((item) => {
            const owner = owners[item.id] ?? item.assumido_por ?? 'operacao';
            const resolucao = resolucoes[item.id] ?? 'acordo_manual';
            const observacao = observacoes[item.id] ?? item.observacao ?? '';

            return (
              <div
                key={item.id}
                className="rounded-lg border border-amber-200/70 bg-background/80 p-4 dark:border-amber-900/70"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{item.status === 'assumido' ? 'Assumido' : 'Pendente'}</Badge>
                      <span className="text-sm font-medium">
                        Embarque #{item.embarque_id ?? '—'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.origem ?? '—'} → {item.destino ?? '—'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Motivo: {item.motivo || 'escalonamento operacional'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Telefone: {item.telefone || '—'} · Pedido: {moeda(item.valor_pedido_motorista)} ·
                      Oferta: {moeda(item.valor_ofertado)} · Faixa: {moeda(item.valor_minimo)} a {moeda(item.valor_maximo)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() => assumirCaso({ id: item.id, assumidoPor: owner })}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Assumir
                    </Button>
                    <Button
                      size="sm"
                      disabled={isSaving}
                      onClick={() =>
                        resolverCaso({
                          id: item.id,
                          owner,
                          resolucao,
                          observacao,
                        })
                      }
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Resolver
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Responsavel</label>
                    <Input
                      value={owner}
                      onChange={(e) =>
                        setOwners((state) => ({ ...state, [item.id]: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Resolucao</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={resolucao}
                      onChange={(e) =>
                        setResolucoes((state) => ({ ...state, [item.id]: e.target.value }))
                      }
                    >
                      {OPCOES_RESOLUCAO.map((opcao) => (
                        <option key={opcao.value} value={opcao.value}>
                          {opcao.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Observacao</label>
                    <Input
                      value={observacao}
                      onChange={(e) =>
                        setObservacoes((state) => ({ ...state, [item.id]: e.target.value }))
                      }
                      placeholder="Ex.: operador ligou e fechou em R$ 4.800"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
