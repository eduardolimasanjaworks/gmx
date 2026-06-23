import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  aprovarPendenciaAprendizadoWhatsapp,
  cancelarPendenciaAprendizadoWhatsapp,
  criarTelefoneTreinador,
  atualizarTelefoneTreinador,
  excluirAprendizadoWhatsapp,
  excluirTelefoneTreinador,
  listarAprendizadosWhatsapp,
  listarPendenciasAprendizadoWhatsapp,
  listarTelefonesTreinadores,
  obterWhatsappIaQrCode,
  obterWhatsappIaStatus,
  reconectarWhatsappIa,
  type AprendizadoWhatsapp,
  type PropostaAprendizadoWhatsapp,
  type TelefoneTreinador,
  type WhatsappIaQrCode,
  type WhatsappIaStatus,
} from '@/services/iagmxTrainingService';
import { AlertTriangle, ChevronDown, Loader2, Plus, RefreshCw, Save, ShieldCheck, ShieldX, Smartphone, Trash2, Unplug } from 'lucide-react';

const EMPTY_FORM = {
  telefone: '',
  nome: '',
  ativo: true,
};

function normalizarTelefone(valor: string) {
  return valor.replace(/\D/g, '');
}

function formatarTelefone(valor: string) {
  const digits = normalizarTelefone(valor).slice(0, 13);
  if (!digits) return '';
  if (digits.length <= 2) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
}

function telefoneValido(valor: string) {
  const digits = normalizarTelefone(valor);
  return digits.length >= 12 && digits.length <= 13;
}

function formatarNumeroConectado(valor?: string | null) {
  if (!valor) return 'Aguardando conexao';
  return formatarTelefone(valor);
}

function traduzirStatusWhatsapp(status?: WhatsappIaStatus | null) {
  if (!status) return 'Carregando status';
  if (status.conectado) return 'Conectado';
  if (status.state === 'connecting') return 'Conectando';
  if (status.state === 'not_found') return 'Instancia ainda nao criada';
  if (status.state === 'close' || status.state === 'closed') return 'Desconectado';
  return status.state || 'Status desconhecido';
}

function extrairAguardeSegundos(mensagem?: string) {
  const match = mensagem?.match(/Aguarde\s+(\d+)s/i);
  return match ? Number(match[1]) : 0;
}

const COOLDOWN_PADRAO_WHATSAPP = {
  atualizar: 3000,
  qr: 8000,
  reconectar: 15000,
} as const;

function tituloAcaoWhatsapp(acao: 'atualizar' | 'qr' | 'reconectar') {
  if (acao === 'atualizar') return 'Verificar agora se conectou';
  if (acao === 'qr') return 'Abrir QR da conexao atual';
  return 'Desconectar e gerar novo QR';
}

function tituloAcaoWhatsappEmEspera(acao: 'atualizar' | 'qr' | 'reconectar', segundos: number) {
  if (acao === 'atualizar') return `Ja ja eu confiro de novo (${segundos}s)`;
  if (acao === 'qr') return `Seguro mais um instante (${segundos}s)`;
  return `Calma, vou reiniciar em ${segundos}s`;
}

function mensagemCooldownWhatsapp(acao: 'atualizar' | 'qr' | 'reconectar', segundos: number) {
  if (acao === 'atualizar') return `Estou esperando ${segundos}s para consultar de novo sem sobrecarregar a conexao.`;
  if (acao === 'qr') return `Estou segurando ${segundos}s antes de pedir outro QR para nao fazer spam na instancia.`;
  return `Estou segurando ${segundos}s antes de reiniciar a conexao para evitar instabilidade desnecessaria.`;
}

export function TrainingPhonesPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [telefones, setTelefones] = useState<TelefoneTreinador[]>([]);
  const [aprendizados, setAprendizados] = useState<AprendizadoWhatsapp[]>([]);
  const [pendencias, setPendencias] = useState<PropostaAprendizadoWhatsapp[]>([]);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [statusWhatsapp, setStatusWhatsapp] = useState<WhatsappIaStatus | null>(null);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [acaoWhatsapp, setAcaoWhatsapp] = useState<'atualizar' | 'qr' | 'reconectar' | null>(null);
  const [erroWhatsapp, setErroWhatsapp] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrData, setQrData] = useState<WhatsappIaQrCode | null>(null);
  const [ultimaConsultaWhatsapp, setUltimaConsultaWhatsapp] = useState<string | null>(null);
  const [cooldownWhatsapp, setCooldownWhatsapp] = useState<Record<'atualizar' | 'qr' | 'reconectar', number>>({
    atualizar: 0,
    qr: 0,
    reconectar: 0,
  });
  const [agoraCooldownWhatsapp, setAgoraCooldownWhatsapp] = useState(Date.now());

  const aplicarCooldownWhatsapp = (
    acao: 'atualizar' | 'qr' | 'reconectar',
    cooldownAte?: string,
    fallbackMs?: number,
  ) => {
    const alvo = cooldownAte ? new Date(cooldownAte).getTime() : Date.now() + (fallbackMs ?? 0);
    setCooldownWhatsapp((atual) => ({
      ...atual,
      [acao]: Number.isFinite(alvo) ? Math.max(atual[acao], alvo) : atual[acao],
    }));
  };

  const segundosRestantesWhatsapp = (acao: 'atualizar' | 'qr' | 'reconectar') =>
    Math.max(0, Math.ceil((cooldownWhatsapp[acao] - agoraCooldownWhatsapp) / 1000));

  const labelBotaoWhatsapp = (acao: 'atualizar' | 'qr' | 'reconectar') => {
    const restante = segundosRestantesWhatsapp(acao);
    return restante > 0 ? tituloAcaoWhatsappEmEspera(acao, restante) : tituloAcaoWhatsapp(acao);
  };

  const acaoCooldownAtivaWhatsapp = (['reconectar', 'qr', 'atualizar'] as const).find(
    (acao) => segundosRestantesWhatsapp(acao) > 0,
  );

  const progressoCooldownWhatsapp = acaoCooldownAtivaWhatsapp
    ? Math.max(
        6,
        Math.min(
          100,
          ((COOLDOWN_PADRAO_WHATSAPP[acaoCooldownAtivaWhatsapp] -
            Math.max(0, cooldownWhatsapp[acaoCooldownAtivaWhatsapp] - agoraCooldownWhatsapp)) /
            COOLDOWN_PADRAO_WHATSAPP[acaoCooldownAtivaWhatsapp]) *
            100,
        ),
      )
    : 0;

  const carregar = async () => {
    setLoading(true);
    setErroCarregamento(null);
    try {
      const [telefonesRes, aprendizadosRes, pendenciasRes] = await Promise.all([
        listarTelefonesTreinadores(),
        listarAprendizadosWhatsapp(),
        listarPendenciasAprendizadoWhatsapp(),
      ]);
      setTelefones(telefonesRes.itens);
      setAprendizados(aprendizadosRes.itens);
      setPendencias(pendenciasRes.itens);
    } catch (error: any) {
      setErroCarregamento(error?.message || 'Nao foi possivel consultar o IAGMX');
      toast({
        title: 'Falha ao carregar treinador via WhatsApp',
        description: error?.message || 'Nao foi possivel consultar o IAGMX',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarWhatsapp = async () => {
    setLoadingWhatsapp(true);
    setErroWhatsapp(null);
    try {
      const status = await obterWhatsappIaStatus();
      setStatusWhatsapp(status);
      setUltimaConsultaWhatsapp(new Date().toISOString());
      return status;
    } catch (error: any) {
      const mensagem = error?.message || 'Nao foi possivel consultar a conexao da i.a';
      setErroWhatsapp(mensagem);
      throw error;
    } finally {
      setLoadingWhatsapp(false);
      setAcaoWhatsapp(null);
    }
  };

  useEffect(() => {
    void carregar();
    void carregarWhatsapp().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (Object.values(cooldownWhatsapp).every((valor) => valor <= Date.now())) return;
    const timer = window.setInterval(() => {
      setAgoraCooldownWhatsapp(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownWhatsapp]);

  useEffect(() => {
    if (!qrDialogOpen || statusWhatsapp?.conectado || acaoWhatsapp !== null) return;
    const timer = window.setInterval(() => {
      void carregarWhatsapp().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [qrDialogOpen, statusWhatsapp?.conectado, acaoWhatsapp]);

  // Auto-refresh WhatsApp status every 30 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (acaoWhatsapp === null && !loadingWhatsapp) {
        void carregarWhatsapp().catch(() => undefined);
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [acaoWhatsapp, loadingWhatsapp]);

  const atualizarWhatsapp = async () => {
    setAcaoWhatsapp('atualizar');
    try {
      const status = await carregarWhatsapp();
      aplicarCooldownWhatsapp('atualizar', status.cooldownAte, status.cooldownMs ?? 3000);
      toast({
        title: status.conectado ? 'Conexao confirmada' : 'Status conferido',
        description: status.conectado
          ? `Numero ${formatarNumeroConectado(status.numeroConectado)} pronto para responder`
          : status.motivoDesconexao || 'A conexao ainda nao esta aberta neste momento',
      });
    } catch (error: any) {
      const segundos = extrairAguardeSegundos(error?.message);
      if (segundos > 0) aplicarCooldownWhatsapp('atualizar', undefined, segundos * 1000);
      toast({
        title: 'Falha ao atualizar conexao da i.a',
        description: error?.message || 'Falha desconhecida',
        variant: 'destructive',
      });
    }
  };

  const abrirQrCode = async () => {
    setQrDialogOpen(true);
    setQrData(null);
    setAcaoWhatsapp('qr');
    try {
      const qr = await obterWhatsappIaQrCode();
      setQrData(qr);
      aplicarCooldownWhatsapp('qr', qr.cooldownAte, qr.cooldownMs ?? 8000);
      if (qr.conectado) {
        await carregarWhatsapp().catch(() => undefined);
      }
    } catch (error: any) {
      const segundos = extrairAguardeSegundos(error?.message);
      if (segundos > 0) aplicarCooldownWhatsapp('qr', undefined, segundos * 1000);
      toast({
        title: 'Falha ao gerar QR code',
        description: error?.message || 'Falha desconhecida',
        variant: 'destructive',
      });
      setQrDialogOpen(false);
    } finally {
      setAcaoWhatsapp(null);
    }
  };

  const reconectarWhatsapp = async () => {
    if (statusWhatsapp?.conectado) {
      const confirmed = window.confirm(
        'Aviso: O número já está conectado. Desconectar e gerar novo QR irá encerrar a sessão atual. Tem certeza?'
      );
      if (!confirmed) return;
    }

    setAcaoWhatsapp('reconectar');
    setQrDialogOpen(true);
    setQrData(null);
    try {
      const qr = await reconectarWhatsappIa();
      setQrData(qr);
      aplicarCooldownWhatsapp('reconectar', qr.cooldownAte, qr.cooldownMs ?? 15000);
      await carregarWhatsapp().catch(() => undefined);
      toast({ title: 'Nova conexao da i.a iniciada' });
    } catch (error: any) {
      const segundos = extrairAguardeSegundos(error?.message);
      if (segundos > 0) aplicarCooldownWhatsapp('reconectar', undefined, segundos * 1000);
      toast({
        title: 'Falha ao reconectar a i.a',
        description: error?.message || 'Falha desconhecida',
        variant: 'destructive',
      });
      setQrDialogOpen(false);
    } finally {
      setAcaoWhatsapp(null);
    }
  };

  const salvarNovo = async () => {
    if (!telefoneValido(form.telefone)) {
      toast({
        title: 'Telefone invalido',
        description: 'Use telefone com DDI, DDD e numero. Exemplo: +55 11 99999-9999',
        variant: 'destructive',
      });
      return;
    }
    setSaving('novo');
    try {
      await criarTelefoneTreinador({
        telefone: normalizarTelefone(form.telefone),
        nome: form.nome.trim() || undefined,
        ativo: form.ativo,
      });
      setForm(EMPTY_FORM);
      toast({ title: 'Telefone autorizado criado' });
      await carregar();
    } catch (error: any) {
      toast({
        title: 'Nao foi possivel criar o telefone',
        description: error?.message || 'Falha desconhecida',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const atualizarCampo = async (item: TelefoneTreinador, patch: Partial<TelefoneTreinador>) => {
    setSaving(`telefone-${item.id}`);
    try {
      await atualizarTelefoneTreinador(item.id, patch);
      await carregar();
    } catch (error: any) {
      toast({
        title: 'Nao foi possivel atualizar o telefone',
        description: error?.message || 'Falha desconhecida',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const removerTelefone = async (id: number) => {
    setSaving(`delete-${id}`);
    try {
      await excluirTelefoneTreinador(id);
      toast({ title: 'Telefone removido' });
      await carregar();
    } catch (error: any) {
      toast({ title: 'Falha ao remover telefone', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const removerAprendizado = async (id: number) => {
    setSaving(`aprendizado-${id}`);
    try {
      await excluirAprendizadoWhatsapp(id);
      toast({ title: 'Aprendizado removido' });
      await carregar();
    } catch (error: any) {
      toast({ title: 'Falha ao remover aprendizado', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const aprovarPendencia = async (id: number) => {
    setSaving(`pendencia-aprovar-${id}`);
    try {
      await aprovarPendenciaAprendizadoWhatsapp(id, 'dashboard_gmx');
      toast({ title: 'Proposta confirmada e aplicada' });
      await carregar();
    } catch (error: any) {
      toast({ title: 'Falha ao aprovar proposta', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const cancelarPendencia = async (id: number) => {
    setSaving(`pendencia-cancelar-${id}`);
    try {
      await cancelarPendenciaAprendizadoWhatsapp(id, 'dashboard_gmx');
      toast({ title: 'Proposta cancelada' });
      await carregar();
    } catch (error: any) {
      toast({ title: 'Falha ao cancelar proposta', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader className="pb-3">
        <Collapsible defaultOpen={false} className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle>Configuracoes de treinamento da i.a</CardTitle>
              <p className="text-sm text-muted-foreground">
                Telefones treinadores, aprendizados recentes e propostas de confirmacao ficam agrupados aqui.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={erroCarregamento ? 'destructive' : 'default'}>
                {erroCarregamento ? 'Falha de conexao' : 'Recurso funcional'}
              </Badge>
              <Badge variant="outline">{telefones.length} telefones</Badge>
              <Badge variant="outline">{aprendizados.length} aprendizados</Badge>
              <Badge variant="outline">{pendencias.filter((item) => item.status === 'pendente').length} pendencias</Badge>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              Abrir configuracoes de treinamento
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6">
            <CardContent className="space-y-6 px-0 pb-0">
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium">Conexao da i.a no WhatsApp</h3>
                    <p className="text-sm text-muted-foreground">
                      Use este QR code para conectar somente o numero controlado pela i.a neste servidor, sem misturar com a conexao externa do outro fluxo.
                    </p>
                  </div>
                  <Badge variant={statusWhatsapp?.conectado ? 'default' : 'secondary'}>
                    {traduzirStatusWhatsapp(statusWhatsapp)}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Numero conectado</div>
                    <div className="mt-2 text-sm font-medium break-all">
                      {formatarNumeroConectado(statusWhatsapp?.numeroConectado)}
                    </div>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Instancia atual da i.a</div>
                    <div className="mt-2 text-sm font-medium break-all">{statusWhatsapp?.instance || 'Aguardando leitura'}</div>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Ultima atualizacao</div>
                    <div className="mt-2 text-sm font-medium">
                      {statusWhatsapp?.atualizadoEm
                        ? new Date(statusWhatsapp.atualizadoEm).toLocaleString('pt-BR')
                        : 'Sem registro ainda'}
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      <div>
                        {statusWhatsapp?.nomePerfil
                          ? `Perfil conectado: ${statusWhatsapp.nomePerfil}`
                          : 'O nome do perfil ainda nao foi informado por esta conexao.'}
                      </div>
                      <div>
                        {ultimaConsultaWhatsapp
                          ? `Ultima verificacao feita no painel: ${new Date(ultimaConsultaWhatsapp).toLocaleString('pt-BR')}`
                          : 'O painel ainda nao concluiu uma verificacao desta conexao nesta sessao.'}
                      </div>
                      <div>
                        {statusWhatsapp?.motivoDesconexao ||
                          statusWhatsapp?.aviso ||
                          'A interface controla apenas a conexao local da i.a. A integracao externa futura permanece separada.'}
                      </div>
                      {erroWhatsapp ? (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          {erroWhatsapp}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void atualizarWhatsapp()}
                    disabled={acaoWhatsapp !== null || loadingWhatsapp || segundosRestantesWhatsapp('atualizar') > 0}
                    className="gap-2"
                  >
                    {acaoWhatsapp === 'atualizar' || loadingWhatsapp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {labelBotaoWhatsapp('atualizar')}
                  </Button>
                  {!statusWhatsapp?.conectado && (
                    <Button
                      type="button"
                      onClick={() => void abrirQrCode()}
                      disabled={acaoWhatsapp !== null || segundosRestantesWhatsapp('qr') > 0}
                      className="gap-2"
                    >
                      {acaoWhatsapp === 'qr' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                      {labelBotaoWhatsapp('qr')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={statusWhatsapp?.conectado ? 'destructive' : 'default'}
                    onClick={() => void reconectarWhatsapp()}
                    disabled={acaoWhatsapp !== null || segundosRestantesWhatsapp('reconectar') > 0}
                    className="gap-2"
                  >
                    {acaoWhatsapp === 'reconectar' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="h-4 w-4" />
                    )}
                    {statusWhatsapp?.conectado
                      ? 'Desconectar e reiniciar'
                      : labelBotaoWhatsapp('reconectar')}
                  </Button>
                </div>
                <div className="rounded-md border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground space-y-2">
                  <div>`Verificar agora se conectou` so confere a conexao e te responde aqui no painel.</div>
                  <div>`Abrir QR da conexao atual` so busca o QR se a sessao ainda estiver desconectada.</div>
                  <div>`Desconectar e gerar novo QR` encerra a sessao atual e abre um novo pareamento com seguranca.</div>
                  {acaoCooldownAtivaWhatsapp ? (
                    <div className="space-y-2 rounded-md border bg-background/70 p-3 text-sm">
                      <div className="font-medium text-foreground">
                        Calma, estou cuidando disso por aqui.
                      </div>
                      <div>
                        {mensagemCooldownWhatsapp(
                          acaoCooldownAtivaWhatsapp,
                          segundosRestantesWhatsapp(acaoCooldownAtivaWhatsapp),
                        )}
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progressoCooldownWhatsapp}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 text-foreground">
                      Pode usar os botoes normalmente. Se eu precisar segurar alguns segundos para proteger a conexao, eu te aviso aqui.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <h3 className="font-medium">Telefones autorizados a treinar a IA por WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    Estes numeros entram em modo treinador quando falam com o IAGMX.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm((s) => ({ ...s, telefone: formatarTelefone(e.target.value) }))}
                      inputMode="tel"
                      aria-invalid={form.telefone.length > 0 && !telefoneValido(form.telefone)}
                    />
                    <p className={`text-xs ${form.telefone.length > 0 && !telefoneValido(form.telefone) ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {form.telefone.length === 0
                        ? 'Formato esperado: +55 11 99999-9999'
                        : telefoneValido(form.telefone)
                          ? 'Telefone valido'
                          : 'Use DDI, DDD e numero'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((s) => ({ ...s, ativo: e.target.checked }))} />
                  Ativo para treinar agora
                </label>

                <Button onClick={() => void salvarNovo()} disabled={saving === 'novo'} className="gap-2">
                  {saving === 'novo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Adicionar telefone autorizado
                </Button>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="font-medium">Telefones treinadores cadastrados</h3>
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando configuracao...
                  </div>
                ) : !telefones.length ? (
                  <div className="text-sm text-muted-foreground">Nenhum telefone autorizado ainda</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {telefones.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={formatarTelefone(item.telefone)}
                              onChange={(e) =>
                                setTelefones((prev) =>
                                  prev.map((row) =>
                                    row.id === item.id ? { ...row, telefone: normalizarTelefone(e.target.value) } : row,
                                  ),
                                )
                              }
                              onBlur={() => {
                                if (!telefoneValido(item.telefone)) return;
                                void atualizarCampo(item, { telefone: normalizarTelefone(item.telefone) });
                              }}
                              inputMode="tel"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.nome || ''}
                              onChange={(e) => setTelefones((prev) => prev.map((row) => row.id === item.id ? { ...row, nome: e.target.value } : row))}
                              onBlur={() => void atualizarCampo(item, { nome: item.nome || '' })}
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="text-left"
                              onClick={() => void atualizarCampo(item, { ativo: !item.ativo })}
                            >
                              <Badge variant={item.ativo ? 'default' : 'secondary'}>{item.ativo ? 'Ativo' : 'Inativo'}</Badge>
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => void atualizarCampo(item, { telefone: normalizarTelefone(item.telefone), nome: item.nome || '' })} disabled={saving === `telefone-${item.id}`}>
                                {saving === `telefone-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => void removerTelefone(item.id)} disabled={saving === `delete-${item.id}`}>
                                {saving === `delete-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="font-medium">Propostas pendentes de confirmacao</h3>
                  <p className="text-sm text-muted-foreground">
                    O telefone autorizado pode propor mudancas por WhatsApp, mas a regra so entra em vigor apos confirmacao.
                  </p>
                </div>
                {loading ? null : !pendencias.filter((item) => item.status === 'pendente').length ? (
                  <div className="text-sm text-muted-foreground">Nenhuma proposta pendente agora</div>
                ) : (
                  <div className="space-y-3">
                    {pendencias.filter((item) => item.status === 'pendente').map((item) => (
                      <div key={item.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">#{item.id} · {item.resumo_sugerido || item.instrucao_sugerida}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.nome_autor || item.telefone_autor} · {new Date(item.criado_em).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          <Badge variant="outline">pendente</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{item.instrucao_sugerida}</div>
                        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                          Origem: {item.origem_texto}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => void aprovarPendencia(item.id)} disabled={saving === `pendencia-aprovar-${item.id}`} className="gap-1">
                            {saving === `pendencia-aprovar-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => void cancelarPendencia(item.id)} disabled={saving === `pendencia-cancelar-${item.id}`} className="gap-1">
                            {saving === `pendencia-cancelar-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="font-medium">Aprendizados recentes vindos do WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    Tudo que entra aqui passa a compor o bloco adicional do prompt real da inferencia.
                  </p>
                </div>
                {loading ? null : !aprendizados.length ? (
                  <div className="text-sm text-muted-foreground">Nenhum aprendizado recebido ainda</div>
                ) : (
                  <div className="space-y-3">
                    {aprendizados.map((item) => (
                      <div key={item.id} className="rounded-lg border p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{item.resumo || item.instrucao}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.nome_autor || item.telefone_autor} · {new Date(item.criado_em).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          <Button size="sm" variant="destructive" onClick={() => void removerAprendizado(item.id)} disabled={saving === `aprendizado-${item.id}`}>
                            {saving === `aprendizado-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">{item.instrucao}</div>
                        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">Origem: {item.origem_texto}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>QR code da conexao da i.a</DialogTitle>
            <DialogDescription>
              Escaneie este QR somente no numero que deve ficar sob controle da i.a neste servidor.
            </DialogDescription>
          </DialogHeader>
          {acaoWhatsapp === 'qr' || acaoWhatsapp === 'reconectar' ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando QR code...
              </div>
            </div>
          ) : statusWhatsapp?.conectado ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                Numero conectado com sucesso. O painel confirmou que a sessao esta aberta nesta instancia.
              </div>
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <div>Numero conectado: <span className="font-medium text-foreground">{formatarNumeroConectado(statusWhatsapp.numeroConectado)}</span></div>
                <div>Perfil desta sessao: <span className="font-medium text-foreground">{statusWhatsapp.nomePerfil || 'Nao informado'}</span></div>
                <div>Ultima verificacao do painel: <span className="font-medium text-foreground">{ultimaConsultaWhatsapp ? new Date(ultimaConsultaWhatsapp).toLocaleString('pt-BR') : 'agora'}</span></div>
              </div>
            </div>
          ) : qrData?.conectado ? (
            <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
              {qrData.mensagem || 'O numero da i.a ja esta conectado neste servidor.'}
            </div>
          ) : qrData?.base64 ? (
            <div className="space-y-4">
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img
                  src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`}
                  alt="QR code da conexao da i.a"
                  className="max-h-[360px] w-full max-w-[360px] object-contain"
                />
              </div>
              {qrData.pairingCode ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Codigo de pareamento: <span className="font-medium text-foreground">{qrData.pairingCode}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
              QR code indisponivel no momento. Use reconectar para iniciar uma nova sessao.
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => void atualizarWhatsapp()}
              disabled={acaoWhatsapp !== null || segundosRestantesWhatsapp('atualizar') > 0}
            >
              {labelBotaoWhatsapp('atualizar')}
            </Button>
            <Button
              type="button"
              onClick={() => void reconectarWhatsapp()}
              disabled={acaoWhatsapp !== null || segundosRestantesWhatsapp('reconectar') > 0}
            >
              {labelBotaoWhatsapp('reconectar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
