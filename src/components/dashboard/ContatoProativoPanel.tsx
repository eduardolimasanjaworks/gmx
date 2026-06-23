import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  adiarContatoProativo,
  adiarContatoProativoEmLote,
  aprovarContatoProativo,
  aprovarContatoProativoEmLote,
  dispararContatoProativo,
  dispararContatoProativoEmLote,
  fetchContatoProativoAtual,
  fetchContatoProativoHistorico,
  type ContatoProativoHistoricoItem,
  gerarContatoProativo,
  type ContatoProativoItem,
  type ContatoProativoSnapshot,
} from '@/services/iagmxContatoProativoService';
import { Clock3, History, Loader2, RefreshCw, Send, ShieldCheck, ShieldX } from 'lucide-react';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  aprovado: 'default',
  disparado: 'secondary',
  adiado: 'outline',
  rejeitado: 'destructive',
  pendente: 'outline',
};

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Aguardando decisao',
  aprovado: 'Liberado para contato',
  disparado: 'Mensagem enviada',
  adiado: 'Contato adiado',
  rejeitado: 'Fora da fila',
};

function fmtHoras(valor: number | null) {
  if (valor == null) return 'sem registro';
  return `${Math.round(valor)}h`;
}

function fmtCidade(item: ContatoProativoItem) {
  return [item.cidade, item.estado].filter(Boolean).join(' / ') || '—';
}

function fmtUltimaLocalizacao(item: ContatoProativoItem) {
  if (!item.ultima_posicao_em) return 'sem localizacao registrada';
  return new Date(item.ultima_posicao_em).toLocaleString('pt-BR');
}

function fmtDisparo(item: { disparado_em: string | null }) {
  if (!item.disparado_em) return 'nao disparado';
  return new Date(item.disparado_em).toLocaleString('pt-BR');
}

function fmtDataReferencia(valor?: string | null) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString('pt-BR');
}

function fmtAte(valor?: string | null) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('pt-BR');
}

export function ContatoProativoPanel({ className }: { className?: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<ContatoProativoSnapshot | null>(null);
  const [historico, setHistorico] = useState<ContatoProativoHistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [intervaloSegundos, setIntervaloSegundos] = useState('20');

  const autor = useMemo(
    () => user?.email || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'portal',
    [user],
  );

  const carregar = async () => {
    setLoading(true);
    try {
      const [data, historicoData] = await Promise.all([
        fetchContatoProativoAtual(),
        fetchContatoProativoHistorico(150),
      ]);
      setSnapshot(data);
      setHistorico(historicoData.itens);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao carregar fila de localizacao',
        description: 'Nao foi possivel ler a fila diaria do IAGMX',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    setSelectedIds((atual) => atual.filter((id) => itens.some((item) => item.id === id)));
  }, [snapshot]);

  const agir = async (chave: string, acao: () => Promise<unknown>, sucesso: string) => {
    setBusy(chave);
    try {
      await acao();
      toast({ title: sucesso });
      await carregar();
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Falha na operacao',
        description: error?.message || 'Nao foi possivel concluir a acao',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const itens = snapshot?.itens ?? [];
  const aprovados = itens.filter((item) => item.status_item === 'aprovado').length;
  const disparados = itens.filter((item) => item.status_item === 'disparado').length;
  const adiados = itens.filter((item) => item.status_item === 'adiado').length;
  const selecionados = itens.filter((item) => selectedIds.includes(item.id));
  const todosSelecionados = itens.length > 0 && selectedIds.length === itens.length;
  const haPendentesSelecionados = selecionados.some((item) => item.status_item === 'pendente');
  const haAprovadosSelecionados = selecionados.some((item) => item.status_item === 'aprovado');
  const haSelecionadosAdiaveis = selecionados.some((item) => item.status_item !== 'disparado');

  const toggleItem = (id: number, checked: boolean) => {
    setSelectedIds((atual) =>
      checked ? [...new Set([...atual, id])] : atual.filter((itemId) => itemId !== id),
    );
  };

  const toggleTodos = (checked: boolean) => {
    setSelectedIds(checked ? itens.map((item) => item.id) : []);
  };

  const aprovarSelecionados = async () => {
    const ids = selecionados.filter((item) => item.status_item === 'pendente').map((item) => item.id);
    if (!ids.length) {
      toast({ title: 'Nenhum pendente selecionado' });
      return;
    }
    await agir(
      'aprovar-lote',
      () => aprovarContatoProativoEmLote(ids, autor),
      'Motoristas selecionados aprovados para contato',
    );
  };

  const dispararSelecionados = async () => {
    const ids = selecionados.filter((item) => item.status_item === 'aprovado').map((item) => item.id);
    if (!ids.length) {
      toast({ title: 'Nenhum aprovado selecionado' });
      return;
    }
    await agir(
      'disparar-lote',
      () =>
        dispararContatoProativoEmLote({
          itemIds: ids,
          autor,
          intervaloMs: Math.max(0, Number(intervaloSegundos || '0')) * 1000,
        }),
      'Disparo em lote concluido',
    );
  };

  const aprovarEDispararSelecionados = async () => {
    const idsPendentes = selecionados
      .filter((item) => item.status_item === 'pendente')
      .map((item) => item.id);
    const idsAprovados = selecionados
      .filter((item) => item.status_item === 'aprovado')
      .map((item) => item.id);
    const ids = [...new Set([...idsPendentes, ...idsAprovados])];
    if (!ids.length) {
      toast({ title: 'Nenhum motorista selecionado' });
      return;
    }
    await agir(
      'aprovar-disparar-lote',
      async () => {
        if (idsPendentes.length) {
          await aprovarContatoProativoEmLote(idsPendentes, autor);
        }
        await dispararContatoProativoEmLote({
          itemIds: ids,
          autor,
          intervaloMs: Math.max(0, Number(intervaloSegundos || '0')) * 1000,
        });
      },
      'Aprovacao e disparo em lote concluidos',
    );
  };

  const adiarSelecionados = async (dias: number) => {
    const ids = selecionados
      .filter((item) => item.status_item !== 'disparado')
      .map((item) => item.id);
    if (!ids.length) {
      toast({ title: 'Nenhum motorista elegivel para adiamento' });
      return;
    }
    await agir(
      `adiar-lote-${dias}`,
      () =>
        adiarContatoProativoEmLote({
          itemIds: ids,
          autor,
          dias,
          observacao: `Contato adiado por ${dias} dia(s) pela equipe`,
        }),
      `Contato adiado por ${dias} dia(s) para os selecionados`,
    );
  };

  return (
    <div className={className ? `${className} space-y-6` : 'space-y-6'}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">Fila de localizacao de hoje</CardTitle>
            <p className="text-sm text-muted-foreground">
              Este recurso define quem a GMX deve acionar hoje para pedir localizacao atual e disponibilidade. O ranking abaixo prioriza quem faz mais tempo que nao atualiza a posicao para a equipe.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => void agir('recarregar', () => carregar(), 'Fila atualizada')}
              disabled={busy === 'recarregar' || loading}
            >
              {busy === 'recarregar' || loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => void agir('gerar', () => gerarContatoProativo().then((data) => setSnapshot(data)), 'Lote diario regenerado')}
              disabled={busy === 'gerar'}
              className="gap-2"
            >
              {busy === 'gerar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerar fila
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Planejamento deste dia</div>
            <div className="mt-2 text-2xl font-semibold">{fmtDataReferencia(snapshot?.lote?.data_referencia)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Lista priorizada para perguntar localizacao e disponibilidade</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Quem pode entrar em contato hoje</div>
            <div className="mt-2 text-2xl font-semibold">{snapshot?.lote?.total_sugeridos ?? 0}</div>
            <div className="mt-1 text-xs text-muted-foreground">Motoristas priorizados pelo tempo sem atualizacao</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Liberados para perguntar agora</div>
            <div className="mt-2 text-2xl font-semibold">{aprovados}</div>
            <div className="mt-1 text-xs text-muted-foreground">Ja revisados pela equipe e prontos para envio</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Ja contatados ou adiados</div>
            <div className="mt-2 text-2xl font-semibold">{disparados + adiados}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {disparados} com mensagem enviada e {adiados} adiados para outro momento
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="fila" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fila">Fila de hoje</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Historico de contatos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fila">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Decidir quem a GMX vai acionar hoje</CardTitle>
              <p className="text-sm text-muted-foreground">
                Abaixo voce decide quem fica liberado para receber a pergunta de localizacao agora, quem deve esperar mais alguns dias e quem ja foi contatado hoje.
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={todosSelecionados}
                    onCheckedChange={(checked) => toggleTodos(checked === true)}
                    aria-label="Selecionar todos"
                  />
                  <div className="text-sm">
                    <div className="font-medium">{selectedIds.length} selecionado(s)</div>
                    <div className="text-muted-foreground">
                      O ranking usa principalmente o tempo desde a ultima localizacao registrada do motorista
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="w-full md:w-[160px]">
                    <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      Espacamento entre mensagens
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="5"
                      value={intervaloSegundos}
                      onChange={(e) => setIntervaloSegundos(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void aprovarSelecionados()}
                    disabled={!haPendentesSelecionados || busy !== null}
                    className="gap-2"
                  >
                    {busy === 'aprovar-lote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Liberar contato
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void adiarSelecionados(3)}
                    disabled={!haSelecionadosAdiaveis || busy !== null}
                    className="gap-2"
                  >
                    {busy === 'adiar-lote-3' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                    Adiar 3 dias
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void dispararSelecionados()}
                    disabled={!haAprovadosSelecionados || busy !== null}
                    className="gap-2"
                  >
                    {busy === 'disparar-lote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar pergunta agora
                  </Button>
                  <Button
                    onClick={() => void aprovarEDispararSelecionados()}
                    disabled={!selectedIds.length || busy !== null}
                    className="gap-2"
                  >
                    {busy === 'aprovar-disparar-lote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Liberar e enviar agora
                  </Button>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando lote diario...
                </div>
              ) : !itens.length ? (
                <div className="text-sm text-muted-foreground">
                  Nenhum motorista sugerido no lote atual
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[48px]">
                          <Checkbox
                            checked={todosSelecionados}
                            onCheckedChange={(checked) => toggleTodos(checked === true)}
                            aria-label="Selecionar todos da tabela"
                          />
                        </TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Ultima localizacao</TableHead>
                        <TableHead>Tempo sem atualizar a localizacao</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itens.map((item) => {
                        const chaveAprovar = `aprovar-${item.id}`;
                        const chaveRejeitar = `rejeitar-${item.id}`;
                        const chaveDisparar = `disparar-${item.id}`;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.includes(item.id)}
                                onCheckedChange={(checked) => toggleItem(item.id, checked === true)}
                                aria-label={`Selecionar ${item.nome || item.motorista_id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{item.nome || `Motorista ${item.motorista_id}`}</div>
                              <div className="text-xs text-muted-foreground">
                                {fmtCidade(item)} {item.operacao ? `| ${item.operacao}` : ''}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>{item.telefone}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.localizacao_atual || 'sem posicao atual'}
                              </div>
                            </TableCell>
                            <TableCell>{fmtUltimaLocalizacao(item)}</TableCell>
                            <TableCell>
                              <div>{fmtHoras(item.horas_sem_posicao)}</div>
                              <div className="text-xs text-muted-foreground">{item.justificativa || 'sem justificativa'}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_VARIANT[item.status_item] || 'outline'}>
                                {STATUS_LABEL[item.status_item] || item.status_item}
                              </Badge>
                              {item.adiar_ate ? (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Ate {fmtAte(item.adiar_ate)}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void agir(
                                      chaveAprovar,
                                      () => aprovarContatoProativo(item.id, autor),
                                      'Motorista aprovado para contato',
                                    )
                                  }
                                  disabled={busy === chaveAprovar || item.status_item === 'disparado'}
                                  className="gap-2"
                                >
                                  {busy === chaveAprovar ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                  Liberar contato
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void agir(
                                      chaveRejeitar,
                                      () => adiarContatoProativo(item.id, autor, 3, 'Contato adiado por 3 dias'),
                                      'Contato adiado por 3 dias',
                                    )
                                  }
                                  disabled={busy === chaveRejeitar || item.status_item === 'disparado'}
                                  className="gap-2"
                                >
                                  {busy === chaveRejeitar ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                                  Adiar 3 dias
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    void agir(
                                      chaveDisparar,
                                      () => dispararContatoProativo(item.id, autor),
                                      'Mensagem proativa enviada ao motorista',
                                    )
                                  }
                                  disabled={busy === chaveDisparar || item.status_item !== 'aprovado'}
                                  className="gap-1"
                                >
                                  {busy === chaveDisparar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                  Enviar pergunta agora
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historico de localizacao enviada</CardTitle>
              <p className="text-sm text-muted-foreground">
                Lista quem recebeu contato para confirmar localizacao e quando o envio aconteceu
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando historico...
                </div>
              ) : !historico.length ? (
                <div className="text-sm text-muted-foreground">
                  Nenhum contato de localizacao foi disparado ainda
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Ultima localizacao conhecida</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Responsavel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historico.map((item) => (
                        <TableRow key={`historico-${item.id}`}>
                          <TableCell>
                            <div className="font-medium">{item.nome || `Motorista ${item.motorista_id}`}</div>
                            <div className="text-xs text-muted-foreground">
                              {fmtCidade(item)} {item.operacao ? `| ${item.operacao}` : ''}
                            </div>
                          </TableCell>
                          <TableCell>{item.telefone}</TableCell>
                          <TableCell>{item.data_referencia}</TableCell>
                          <TableCell>{item.localizacao_atual || 'sem posicao atual'}</TableCell>
                          <TableCell>{fmtDisparo(item)}</TableCell>
                          <TableCell>{item.disparado_por || 'portal'}</TableCell>
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
