import { History, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilaAcoesToolbar } from './FilaAcoesToolbar';
import { FilaCriteriosPanel } from './FilaCriteriosPanel';
import { FilaTabela } from './FilaTabela';
import { useContatoProativoFila } from './useContatoProativoFila';

function fmtData(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

function fmtDataRef(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR');
}

export function ContatoProativoPanelV2({ className }: { className?: string }) {
  const fila = useContatoProativoFila();

  const {
    snapshot, historico, loading, busy,
    selectedIds, itensFiltrados, itensBrutos, selecionados,
    filtros, setFiltros, criterios, setCriterios,
    diasAdiar, setDiasAdiar, intervaloSegundos, setIntervaloSegundos,
    toggleItem, toggleTodos,
    aprovarSelecionados, adiarSelecionados, dispararSelecionados, aprovarEDisparar,
    aprovarItem, adiarItem, dispararItem,
    regenerar, carregar,
    totalEmCarga, totalPadrao, diasCoberturaEstimado,
  } = fila;

  const aprovados = itensBrutos.filter((i) => i.status_item === 'aprovado').length;
  const disparados = itensBrutos.filter((i) => i.status_item === 'disparado').length;
  const adiados = itensBrutos.filter((i) => i.status_item === 'adiado').length;
  const todosSelecionados = itensFiltrados.length > 0 && selectedIds.length === itensFiltrados.length;
  const haPendentesSel = selecionados.some((i) => i.status_item === 'pendente');
  const haAprovadosSel = selecionados.some((i) => i.status_item === 'aprovado');
  const haAdiaveis = selecionados.some((i) => i.status_item !== 'disparado');

  return (
    <div className={className ? `${className} space-y-4` : 'space-y-4'}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">Fila de localizacao de hoje</CardTitle>
            <p className="text-sm text-muted-foreground">
              Motoristas priorizados por tempo sem atualizacao de posicao. Em carga = contatados diariamente. Disponíveis = a cada {criterios.janela_padrao_horas ?? 72}h.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={!!busy || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={regenerar} disabled={!!busy} className="gap-1">
              {busy === 'gerar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerar fila
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {[
            { label: 'Data do lote', val: fmtDataRef(snapshot?.lote?.data_referencia), sub: 'Referencia do dia atual' },
            { label: 'Sugeridos', val: snapshot?.lote?.total_sugeridos ?? 0, sub: 'Total no lote gerado' },
            { label: 'Em carga', val: totalEmCarga, sub: 'Motoristas com frete ativo' },
            { label: 'Disponiveis', val: totalPadrao, sub: 'Motoristas sem carga ativa' },
            { label: 'Liberados / Enviados / Adiados', val: `${aprovados} / ${disparados} / ${adiados}`, sub: 'Status atual do lote' },
          ].map(({ label, val, sub }) => (
            <div key={label} className="rounded-lg border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="mt-1 text-xl font-semibold">{val}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <FilaCriteriosPanel
        criterios={criterios}
        onChange={setCriterios}
        onRegerar={regenerar}
        busy={!!busy}
        diasCoberturaEstimado={diasCoberturaEstimado}
        totalMotoristas={itensBrutos.length}
      />

      <Tabs defaultValue="fila" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fila">Fila de hoje</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Historico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fila">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Decidir quem a GMX vai acionar hoje</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione, filtre por categoria ou nome, defina quantos dias adiar e quando disparar.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilaAcoesToolbar
                totalItens={itensFiltrados.length}
                totalSelecionados={selectedIds.length}
                totalEmCarga={totalEmCarga}
                totalPadrao={totalPadrao}
                filtros={filtros}
                onFiltros={setFiltros}
                diasAdiar={diasAdiar}
                onDiasAdiar={setDiasAdiar}
                intervaloSegundos={intervaloSegundos}
                onIntervalo={setIntervaloSegundos}
                busy={busy}
                haPendentesSelecionados={haPendentesSel}
                haAprovadosSelecionados={haAprovadosSel}
                haSelecionadosAdiaveis={haAdiaveis}
                todosSelecionados={todosSelecionados}
                onToggleTodos={toggleTodos}
                onAprovar={aprovarSelecionados}
                onAdiar={adiarSelecionados}
                onDisparar={dispararSelecionados}
                onAprovarEDisparar={aprovarEDisparar}
              />
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando lote...
                </div>
              ) : (
                <FilaTabela
                  itens={itensFiltrados}
                  selectedIds={selectedIds}
                  busy={busy}
                  onToggleItem={toggleItem}
                  onToggleTodos={toggleTodos}
                  onAprovar={aprovarItem}
                  onAdiar={adiarItem}
                  onDisparar={dispararItem}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historico de contatos</CardTitle>
              <p className="text-sm text-muted-foreground">Quem recebeu mensagem de localizacao e quando</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando historico...
                </div>
              ) : !historico.length ? (
                <p className="text-sm text-muted-foreground">Nenhum contato disparado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Responsavel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historico.map((item) => (
                        <TableRow key={`h-${item.id}`}>
                          <TableCell>
                            <div className="font-medium">{item.nome ?? `Motorista ${item.motorista_id}`}</div>
                            <div className="text-xs text-muted-foreground">
                              {[item.cidade, item.estado].filter(Boolean).join(' / ') || '—'}
                            </div>
                          </TableCell>
                          <TableCell>{item.telefone}</TableCell>
                          <TableCell>{item.em_carga ? 'Em carga' : 'Disponivel'}</TableCell>
                          <TableCell>{item.data_referencia}</TableCell>
                          <TableCell>{fmtData(item.disparado_em)}</TableCell>
                          <TableCell>{item.disparado_por ?? 'portal'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
