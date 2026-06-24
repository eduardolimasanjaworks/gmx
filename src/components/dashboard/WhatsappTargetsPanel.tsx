/**
 * Renderiza os dois alvos WhatsApp da IA no GMX sem misturar contratos.
 * Mantem QR, status e reconexao centralizados por alvo e por cooldown.
 * Reflete a regra de pausa global inicial com liberacao individual por contato.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Smartphone, Unplug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  listarWhatsappIaAlvos,
  obterWhatsappAlvoQrCode,
  obterWhatsappAlvoStatus,
  reconectarWhatsappAlvo,
  type WhatsappIaQrCode,
  type WhatsappIaStatus,
} from '@/services/iagmxTrainingService';
import { useToast } from '@/hooks/use-toast';

type TargetId = 'auxiliar_teste' | 'oficial_gmx';
type AcaoId = 'atualizar' | 'qr' | 'reconectar';

const PADRAO_COOLDOWN = { atualizar: 3000, qr: 8000, reconectar: 15000 } as const;

function formatarNumero(valor?: string | null) {
  const digits = String(valor || '').replace(/\D/g, '');
  if (!digits) return 'Aguardando conexao';
  if (digits.length <= 2) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
}

function traduzirStatus(status?: WhatsappIaStatus | null) {
  if (!status) return 'Carregando status';
  if (status.conectado) return 'Conectado';
  if (status.state === 'stale_open') return 'Sessao inconsistente';
  if (status.state === 'connecting') return 'Conectando';
  if (status.state === 'not_found') return 'Instancia ainda nao criada';
  if (status.state === 'close' || status.state === 'closed') return 'Desconectado';
  return status.state || 'Status desconhecido';
}

function formatarData(valor?: string | null) {
  if (!valor) return 'Sem registro ainda';
  return new Date(valor).toLocaleString('pt-BR');
}

function dadosResiduais(status?: WhatsappIaStatus | null) {
  return Boolean(status && !status.conectado && (status.state === 'stale_open' || status.podeEnviar === false));
}

export function WhatsappTargetsPanel() {
  const { toast } = useToast();
  const [targets, setTargets] = useState<WhatsappIaStatus[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<Record<TargetId, AcaoId | null>>({
    auxiliar_teste: null,
    oficial_gmx: null,
  });
  const [qrData, setQrData] = useState<Partial<Record<TargetId, WhatsappIaQrCode | null>>>({});
  const [feedback, setFeedback] = useState<Partial<Record<TargetId, string | null>>>({});
  const [qrOpen, setQrOpen] = useState<Partial<Record<TargetId, boolean>>>({});
  const [cooldown, setCooldown] = useState<Record<string, number>>({});
  const [agora, setAgora] = useState(Date.now());
  const [pausaGlobalInicial, setPausaGlobalInicial] = useState(true);

  const cooldownAtivo = useMemo(
    () => Object.values(cooldown).some((valor) => valor > Date.now()),
    [cooldown],
  );

  useEffect(() => {
    if (!cooldownAtivo) return;
    const timer = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownAtivo]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (Object.values(acao).every((valor) => valor === null)) {
        void carregar();
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [acao]);

  async function carregar() {
    try {
      setErro(null);
      const data = await listarWhatsappIaAlvos();
      setTargets(data.itens);
      setPausaGlobalInicial(Boolean(data.pausaGlobalInicial));
    } catch (error: any) {
      setErro(error?.message || 'Nao foi possivel consultar os alvos WhatsApp');
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  function aplicarCooldown(target: TargetId, action: AcaoId, ate?: string, ms?: number) {
    const valor = ate ? new Date(ate).getTime() : Date.now() + (ms ?? PADRAO_COOLDOWN[action]);
    setCooldown((prev) => ({ ...prev, [`${target}:${action}`]: valor }));
  }

  function segundosRestantes(target: TargetId, action: AcaoId) {
    return Math.max(0, Math.ceil(((cooldown[`${target}:${action}`] ?? 0) - agora) / 1000));
  }

  async function atualizarTarget(target: TargetId) {
    setAcao((prev) => ({ ...prev, [target]: 'atualizar' }));
    try {
      const status = await obterWhatsappAlvoStatus(target);
      setFeedback((prev) => ({ ...prev, [target]: null }));
      setTargets((prev) => prev.map((item) => (item.alvo === target ? status : item)));
      aplicarCooldown(target, 'atualizar', status.cooldownAte, status.cooldownMs);
      toast({
        title: status.conectado ? 'Conexao confirmada' : 'Status conferido',
        description: status.conectado ? `${status.titulo}: pronto para responder` : status.motivoDesconexao || traduzirStatus(status),
      });
    } catch (error: any) {
      toast({ title: 'Falha ao consultar alvo', description: error?.message, variant: 'destructive' });
    } finally {
      setAcao((prev) => ({ ...prev, [target]: null }));
    }
  }

  async function abrirQr(target: TargetId) {
    setAcao((prev) => ({ ...prev, [target]: 'qr' }));
    setQrOpen((prev) => ({ ...prev, [target]: true }));
    try {
      const qr = await obterWhatsappAlvoQrCode(target);
      setQrData((prev) => ({ ...prev, [target]: qr }));
      setFeedback((prev) => ({ ...prev, [target]: null }));
      aplicarCooldown(target, 'qr', qr.cooldownAte, qr.cooldownMs);
      await atualizarTarget(target);
    } catch (error: any) {
      setFeedback((prev) => ({ ...prev, [target]: error?.message || 'Falha ao abrir o QR deste alvo.' }));
      toast({ title: 'Falha ao abrir QR', description: error?.message, variant: 'destructive' });
    } finally {
      setAcao((prev) => ({ ...prev, [target]: null }));
    }
  }

  async function reconectarTarget(target: TargetId) {
    setAcao((prev) => ({ ...prev, [target]: 'reconectar' }));
    setQrOpen((prev) => ({ ...prev, [target]: true }));
    try {
      const qr = await reconectarWhatsappAlvo(target);
      setQrData((prev) => ({ ...prev, [target]: qr }));
      setFeedback((prev) => ({ ...prev, [target]: null }));
      aplicarCooldown(target, 'reconectar', qr.cooldownAte, qr.cooldownMs);
      await atualizarTarget(target);
      toast({
        title: qr.base64 ? 'Novo QR gerado' : 'Reconexao conferida',
        description: qr.base64 ? 'O novo pareamento ja esta pronto.' : 'Ainda nao existe QR utilizavel para este alvo.',
      });
    } catch (error: any) {
      setFeedback((prev) => ({ ...prev, [target]: error?.message || 'Falha ao reconectar este alvo.' }));
      toast({ title: 'Falha ao reconectar alvo', description: error?.message, variant: 'destructive' });
    } finally {
      setAcao((prev) => ({ ...prev, [target]: null }));
    }
  }

  const sortedTargets = [...targets].sort((a, b) => a.alvo.localeCompare(b.alvo));

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
        {pausaGlobalInicial
          ? 'A IA começa desligada por padrão para todos os contatos nos dois numeros. Libere individualmente os contatos que podem voltar a falar com a IA.'
          : 'A IA está em modo global liberado. Ainda é possível pausar ou liberar contatos individualmente.'}
      </div>
      {erro ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {sortedTargets.map((status) => {
          const target = status.alvo;
          const qr = qrData[target];
          return (
            <div key={target} className="rounded-lg border p-4 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">{status.titulo}</h3>
                  <p className="text-sm text-muted-foreground">{status.descricao}</p>
                </div>
                <Badge variant={status.conectado ? 'default' : 'secondary'}>{traduzirStatus(status)}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border bg-muted/20 p-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">{dadosResiduais(status) ? 'Ultimo numero visto' : 'Numero conectado'}</div><div className="mt-2 text-sm font-medium break-all">{dadosResiduais(status) && !status.numeroConectado ? 'Sem conexao valida' : formatarNumero(status.numeroConectado)}</div></div>
                <div className="rounded-md border bg-muted/20 p-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">Instancia atual</div><div className="mt-2 text-sm font-medium break-all">{status.instance}</div></div>
                <div className="rounded-md border bg-muted/20 p-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">{dadosResiduais(status) ? 'Ultimo registro residual' : 'Ultima atualizacao'}</div><div className="mt-2 text-sm font-medium">{formatarData(status.atualizadoEm)}</div></div>
              </div>
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground space-y-1">
                <div>{status.nomePerfil ? `${dadosResiduais(status) ? 'Ultimo perfil visto' : 'Perfil conectado'}: ${status.nomePerfil}` : 'Perfil ainda nao identificado por esta conexao.'}</div>
                <div>{status.motivoDesconexao || status.aviso || 'Sem observacoes adicionais para este alvo.'}</div>
                {feedback[target] ? <div className="text-foreground">Aviso operacional: {feedback[target]}</div> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void atualizarTarget(target)} disabled={acao[target] !== null || segundosRestantes(target, 'atualizar') > 0} className="gap-2">
                  {acao[target] === 'atualizar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {segundosRestantes(target, 'atualizar') > 0 ? `Ja ja eu confiro de novo (${segundosRestantes(target, 'atualizar')}s)` : 'Verificar agora se conectou'}
                </Button>
                {status.permiteQr !== false ? (
                  <Button type="button" onClick={() => void abrirQr(target)} disabled={acao[target] !== null || segundosRestantes(target, 'qr') > 0} className="gap-2">
                    {acao[target] === 'qr' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  {segundosRestantes(target, 'qr') > 0 ? `Seguro mais um instante (${segundosRestantes(target, 'qr')}s)` : 'Abrir QR da conexao atual'}
                  </Button>
                ) : null}
                <Button type="button" variant="destructive" onClick={() => void reconectarTarget(target)} disabled={!status.permiteReconectar || acao[target] !== null || segundosRestantes(target, 'reconectar') > 0} className="gap-2">
                  {acao[target] === 'reconectar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                  {status.permiteReconectar
                    ? segundosRestantes(target, 'reconectar') > 0
                      ? `Calma, vou reiniciar em ${segundosRestantes(target, 'reconectar')}s`
                      : 'Desconectar e gerar novo QR'
                    : 'Reconexao bloqueada neste alvo'}
                </Button>
              </div>

              <Dialog open={Boolean(qrOpen[target])} onOpenChange={(open) => setQrOpen((prev) => ({ ...prev, [target]: open }))}>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>{status.titulo}</DialogTitle>
                    <DialogDescription>{status.descricao}</DialogDescription>
                  </DialogHeader>
                  {status.conectado && !qr?.base64 ? (
                    <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">Este alvo ja aparece conectado nesta instancia.</div>
                  ) : qr?.base64 ? (
                    <div className="space-y-4">
                      <div className="flex justify-center rounded-lg border bg-white p-4">
                        <img src={qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`} alt={`QR ${status.titulo}`} className="max-h-[360px] w-full max-w-[360px] object-contain" />
                      </div>
                      {qr.pairingCode ? <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Codigo de pareamento: <span className="font-medium text-foreground">{qr.pairingCode}</span></div> : null}
                    </div>
                  ) : (
                    <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">{feedback[target] || qr?.mensagem || 'QR code indisponivel no momento para este alvo.'}</div>
                  )}
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => void atualizarTarget(target)}>Verificar agora se conectou</Button>
                    <Button type="button" onClick={() => void reconectarTarget(target)} disabled={!status.permiteReconectar}>Desconectar e gerar novo QR</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>
      <div className="rounded-md border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground space-y-2">
        <div><code>Verificar agora se conectou</code> so confere o estado atual do alvo.</div>
        <div><code>Abrir QR da conexao atual</code> tenta abrir o QR sem derrubar a sessao e, se o upstream travar, devolve aviso operacional em vez de fingir conexao.</div>
        <div><code>Desconectar e gerar novo QR</code> so fica liberado para o numero oficial GMX.</div>
        <div className="flex items-center gap-2 text-foreground"><AlertTriangle className="h-4 w-4" /> O numero auxiliar de teste nao pode ser reconectado por este painel.</div>
      </div>
    </div>
  );
}
