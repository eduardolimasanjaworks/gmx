import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, Truck, User, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { rankMotoristasParaEmbarque, obterTelefoneMotorista } from '@/lib/rankMotoristas';
import {
  dispararOfertaIagmx,
  montarPreviewMensagemOferta,
} from '@/services/dispararOfertaService';
import type { MatchingScore } from '@/lib/matchingAlgorithm';

export interface EmbarqueOferta {
  id: string;
  origin: string;
  destination: string;
  produto_predominante?: string;
  operacao?: string;
  valor_ofertado?: number;
  valor_minimo?: number;
  valor_maximo?: number;
  rota_status?: string;
}

interface OfertarMotoristaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embarque: EmbarqueOferta | null;
  onSuccess?: () => void;
}

export function OfertarMotoristaDialog({
  open,
  onOpenChange,
  embarque,
  onSuccess,
}: OfertarMotoristaDialogProps) {
  const [enviando, setEnviando] = useState(false);
  const [indice, setIndice] = useState(0);

  const { data: ranking = [], isLoading } = useQuery({
    queryKey: ['rank-motoristas', embarque?.id],
    queryFn: () => (embarque ? rankMotoristasParaEmbarque(embarque, 10) : []),
    enabled: open && !!embarque?.id,
  });

  const principal: MatchingScore | undefined = ranking[indice];
  const proximo: MatchingScore | undefined = ranking[indice + 1];

  const valorOferta =
    embarque?.valor_ofertado ??
    embarque?.valor_maximo ??
    embarque?.valor_minimo ??
    0;

  const preview =
    embarque &&
    montarPreviewMensagemOferta({
      origem: embarque.origin,
      destino: embarque.destination,
      valorOfertado: Number(valorOferta),
      operacao: embarque.operacao,
      produto: embarque.produto_predominante,
    });

  const autorizar = async () => {
    if (!embarque || !principal) return;
    setEnviando(true);
    try {
      const telefone = await obterTelefoneMotorista(principal.motorista_id);
      if (!telefone || telefone.length < 10) {
        toast.error('Motorista sem telefone cadastrado');
        return;
      }

      const resultado = await dispararOfertaIagmx({
        embarqueId: embarque.id,
        motoristaId: principal.motorista_id,
        telefone,
        origem: embarque.origin,
        destino: embarque.destination,
        valorOfertado: Number(valorOferta),
        valorMinimo: embarque.valor_minimo,
        valorMaximo: embarque.valor_maximo,
        operacao: embarque.operacao,
        produto: embarque.produto_predominante,
      });

      if (resultado.ok && resultado.enviado) {
        toast.success(`Oferta enviada para ${principal.motorista_nome}`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(resultado.motivo || 'Falha no envio — WhatsApp pode estar desconectado');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao disparar oferta');
    } finally {
      setEnviando(false);
    }
  };

  const usarProximo = () => {
    if (indice + 1 < ranking.length) setIndice((i) => i + 1);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setIndice(0);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ofertar frete via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Mensagem fixa do ERP (não é IA). Após envio, a IA só conduz a resposta do motorista.
          </DialogDescription>
        </DialogHeader>

        {embarque && (
          <p className="text-sm font-medium">
            {embarque.origin} → {embarque.destination}
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !principal ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum motorista rankeado para esta carga.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-primary/5 border-primary/20">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    1º no ranking
                  </p>
                  <p className="font-semibold flex items-center gap-2 mt-1">
                    <User className="h-4 w-4" />
                    {principal.motorista_nome}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Score {principal.score_total}% · {principal.justificativa.localizacao}
                  </p>
                </div>
                <Badge>{principal.compatibilidade}</Badge>
              </div>
            </div>

            {proximo && (
              <div className="border rounded-lg p-3 bg-muted/30 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase">Próximo no rank</p>
                  <p className="text-sm font-medium truncate">{proximo.motorista_nome}</p>
                  <p className="text-xs text-muted-foreground">Score {proximo.score_total}%</p>
                </div>
                {indice === 0 && ranking.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={usarProximo}>
                    Usar próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {indice > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIndice(0)}>
                    Voltar ao 1º
                  </Button>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Prévia da mensagem</p>
              <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-md border max-h-40 overflow-y-auto">
                {preview}
              </pre>
            </div>

            {(embarque?.valor_minimo != null || embarque?.valor_maximo != null) && (
              <p className="text-xs text-muted-foreground">
                Faixa negociação IA:{' '}
                {embarque.valor_minimo != null &&
                  `mín ${Number(embarque.valor_minimo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`}
                {embarque.valor_maximo != null &&
                  ` · máx ${Number(embarque.valor_maximo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={autorizar}
            disabled={!principal || enviando || embarque?.rota_status === 'pendente'}
            className="gap-2"
          >
            {enviando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Truck className="h-4 w-4" />
            )}
            Autorizar disparo WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
