import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bot, BotOff, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  despausarIaMotorista,
  limparPrecisaAtendimento,
  marcarPrecisaAtendimento,
  obterEstadoAtendimentoIa,
  pausarIaMotorista,
  type EstadoAtendimentoIa,
} from '@/services/iagmxAtendimentoService';
import { directus } from '@/lib/directus';
import { updateItem } from '@directus/sdk';

interface IaAtendimentoPanelProps {
  telefone?: string | null;
  motoristaId?: number | null;
  onUpdate?: () => void;
}

function formatarData(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function IaAtendimentoPanel({ telefone, motoristaId, onUpdate }: IaAtendimentoPanelProps) {
  const { toast } = useToast();
  const [estado, setEstado] = useState<EstadoAtendimentoIa | null>(null);
  const [loading, setLoading] = useState(false);
  const [acao, setAcao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!telefone?.trim()) return;
    setLoading(true);
    try {
      const e = await obterEstadoAtendimentoIa(telefone);
      setEstado(e);
    } finally {
      setLoading(false);
    }
  }, [telefone]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const syncDirectus = async (patch: Record<string, unknown>) => {
    if (!motoristaId) return;
    try {
      await directus.request(updateItem('cadastro_motorista', motoristaId, patch));
      onUpdate?.();
    } catch {
      /* iagmx já sincroniza — fallback silencioso */
    }
  };

  const handlePausar = async () => {
    if (!telefone) return;
    setAcao('pausar');
    const ok = await pausarIaMotorista(telefone, 'pausado_pelo_erp');
    if (ok) {
      await syncDirectus({
        ia_pausada: true,
        precisa_atendimento: true,
        ia_pausa_motivo: 'pausado_pelo_erp',
        precisa_atendimento_motivo: 'Atendimento humano solicitado no ERP',
      });
      toast({ title: 'IA pausada para este motorista' });
      await carregar();
    } else {
      toast({ title: 'Falha ao pausar IA', variant: 'destructive' });
    }
    setAcao(null);
  };

  const handleDespausar = async () => {
    if (!telefone) return;
    setAcao('despausar');
    const ok = await despausarIaMotorista(telefone);
    if (ok) {
      await syncDirectus({ ia_pausada: false, ia_pausa_motivo: null });
      toast({ title: 'IA reativada' });
      await carregar();
    } else {
      toast({ title: 'Falha ao reativar IA', variant: 'destructive' });
    }
    setAcao(null);
  };

  const handleLimparAtendimento = async () => {
    if (!telefone) return;
    setAcao('limpar');
    const ok = await limparPrecisaAtendimento(telefone);
    if (ok) {
      await syncDirectus({ precisa_atendimento: false, precisa_atendimento_motivo: null });
      toast({ title: 'Flag de atendimento removida' });
      await carregar();
    } else {
      toast({ title: 'Falha ao limpar flag', variant: 'destructive' });
    }
    setAcao(null);
  };

  const handleMarcarAtendimento = async () => {
    if (!telefone) return;
    setAcao('marcar');
    const ok = await marcarPrecisaAtendimento(telefone, 'marcado_manual_erp');
    if (ok) {
      await syncDirectus({
        precisa_atendimento: true,
        precisa_atendimento_motivo: 'Marcado manualmente no ERP',
      });
      toast({ title: 'Motorista marcado como precisa atendimento' });
      await carregar();
    } else {
      toast({ title: 'Falha ao marcar', variant: 'destructive' });
    }
    setAcao(null);
  };

  if (!telefone?.trim()) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Cadastre o telefone para controlar a IA WhatsApp.
        </CardContent>
      </Card>
    );
  }

  const iaPausada = estado?.ia_pausada ?? false;
  const precisa = estado?.precisa_atendimento ?? false;

  return (
    <Card className={precisa ? 'border-orange-400 shadow-sm' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {iaPausada ? <BotOff className="h-4 w-4 text-orange-600" /> : <Bot className="h-4 w-4 text-green-600" />}
            Atendimento WhatsApp (IA)
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void carregar()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant={iaPausada ? 'destructive' : 'default'} className={!iaPausada ? 'bg-green-600' : undefined}>
            {iaPausada ? 'IA pausada' : 'IA ativa'}
          </Badge>
          {precisa && (
            <Badge className="bg-orange-500 hover:bg-orange-500 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Precisa atendimento
            </Badge>
          )}
        </div>

        {estado?.ultima_intencao_whatsapp && (
          <p className="text-muted-foreground">
            Última intenção: <span className="font-medium text-foreground">{estado.ultima_intencao_whatsapp}</span>
            {' · '}
            {formatarData(estado.ultima_intencao_em)}
          </p>
        )}

        {estado?.precisa_atendimento_motivo && (
          <p className="text-orange-800 bg-orange-50 border border-orange-200 rounded-md px-2 py-1.5 text-xs">
            {estado.precisa_atendimento_motivo}
          </p>
        )}

        {estado?.ia_pausa_motivo && iaPausada && (
          <p className="text-xs text-muted-foreground">Motivo pausa: {estado.ia_pausa_motivo}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {iaPausada ? (
            <Button size="sm" variant="outline" onClick={() => void handleDespausar()} disabled={!!acao}>
              {acao === 'despausar' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Reativar IA
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void handlePausar()} disabled={!!acao}>
              {acao === 'pausar' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Pausar IA
            </Button>
          )}
          {precisa ? (
            <Button size="sm" variant="secondary" onClick={() => void handleLimparAtendimento()} disabled={!!acao}>
              {acao === 'limpar' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Atendido
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => void handleMarcarAtendimento()} disabled={!!acao}>
              Marcar precisa atendimento
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
