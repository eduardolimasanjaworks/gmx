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
import {
  obterHistoricoNominalOferta,
  type HistoricoOfertaNominalResumo,
} from '@/services/iagmxOfertaHistoricoService';
import type { MatchingScore } from '@/lib/matchingAlgorithm';

export interface EmbarqueOferta {
  id: string;
  config_rota_id?: number | null;
  origin: string;
  destination: string;
  produto_predominante?: string;
  operacao?: string;
  valor_ofertado?: number;
  valor_minimo?: number;
  valor_maximo?: number;
  rota_status?: string;
  rejected_drivers_count?: number;
  needs_manual_review?: boolean;
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

  const { data: historicoNominal, isLoading: loadingHistorico } = useQuery<HistoricoOfertaNominalResumo>({
    queryKey: ['historico-nominal-oferta', embarque?.id],
    queryFn: () => obterHistoricoNominalOferta(embarque!.id),
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
        configRotaId: embarque.config_rota_id,
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

  const renderHistoricoLista = (
    titulo: string,
    itens: HistoricoOfertaNominalResumo['recusas'],
    vazio: string,
    tone: 'default' | 'destructive' | 'secondary' = 'default',
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
        <Badge variant={tone}>{itens.length}</Badge>
      </div>
      {!itens.length ? (
        <p className="text-xs text-muted-foreground">{vazio}</p>
      ) : (
        <div className="space-y-2">
          {itens.slice(0, 4).map((item) => (
            <div key={`${item.id}-${item.evento_id || 'evt'}`} className="rounded-md border bg-background p-2">
              <p className="text-sm font-medium">{item.motorista_nome || item.telefone || 'Motorista sem identificacao'}</p>
              <p className="text-xs text-muted-foreground">
                {item.motivo || item.subtipo || 'Sem motivo informado'}
              </p>
              {(item.valor_pedido_motorista != null || item.valor_aceito != null || item.valor_ofertado != null) && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {item.valor_pedido_motorista != null ? `Pediu R$ ${item.valor_pedido_motorista}` : null}
                  {item.valor_pedido_motorista != null && item.valor_ofertado != null ? ' · ' : null}
                  {item.valor_ofertado != null ? `Oferta R$ ${item.valor_ofertado}` : null}
                  {item.valor_aceito != null ? `${item.valor_ofertado != null || item.valor_pedido_motorista != null ? ' · ' : ''}Aceito R$ ${item.valor_aceito}` : null}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const formatarDataHora = (valor?: string | null) => {
    if (!valor) return null;
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    return data.toLocaleString('pt-BR');
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
            Ranking de motoristas para este embarque
          </DialogTitle>
          <DialogDescription>
            Aqui voce ve os motoristas elegiveis para este embarque comparando a origem georreferenciada da carga com o ultimo GPS valido do motorista, a data prevista de liberacao e as operacoes elegiveis do cadastro. Esta lista e diferente da fila diaria de abordagem proativa.
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
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Situação atual da oferta
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {embarque?.rejected_drivers_count || 0} recusas registradas
                </Badge>
                {embarque?.needs_manual_review ? (
                  <Badge variant="destructive">Precisa intervenção humana</Badge>
                ) : (
                  <Badge variant="secondary">Sem intervenção humana sinalizada</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Esta tela serve para um embarque especifico. Ela nao usa a fila diaria de atualizacao de status e localizacao.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Historico nominal deste embarque
              </p>
              {loadingHistorico ? (
                <p className="text-xs text-muted-foreground">Carregando retornos nominais da IA...</p>
              ) : (
                <div className="space-y-3">
                  {renderHistoricoLista(
                    'Recusas',
                    historicoNominal?.recusas || [],
                    'Nenhuma recusa nominal registrada ainda',
                    'secondary',
                  )}
                  {renderHistoricoLista(
                    'Escalonamentos',
                    historicoNominal?.escalonamentos || [],
                    'Nenhum caso com intervencao humana registrado ainda',
                    'destructive',
                  )}
                  {renderHistoricoLista(
                    'Aceites',
                    historicoNominal?.aceites || [],
                    'Nenhum aceite nominal registrado ainda',
                    'default',
                  )}
                </div>
              )}
            </div>

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
                  <p className="text-xs text-muted-foreground mt-1">
                    {principal.justificativa.disponibilidade}
                  </p>
                  {principal.localizacao_atual ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Localizacao atual: {principal.localizacao_atual}
                    </p>
                  ) : null}
                  {principal.localizacao_prevista && principal.localizacao_prevista !== principal.localizacao_atual ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Localizacao prevista: {principal.localizacao_prevista}
                      {principal.tempo_ate_disponivel_horas != null && principal.tempo_ate_disponivel_horas > 0
                        ? ` · libera em ${principal.tempo_ate_disponivel_horas.toFixed(1)}h`
                        : ''}
                    </p>
                  ) : null}
                  {principal.data_ultima_atualizacao ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ultima atualizacao: {formatarDataHora(principal.data_ultima_atualizacao)}
                    </p>
                  ) : null}
                  {embarque?.operacao ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Operacao exigida no embarque: {embarque.operacao}
                    </p>
                  ) : null}
                </div>
                <Badge>{principal.compatibilidade}</Badge>
              </div>
            </div>

            <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Lista do ranking atual</p>
                  <p className="text-sm font-medium">
                    Motoristas ordenados pela combinacao entre distancia real ate a origem, previsao de liberacao e aderencia da operacao
                  </p>
                </div>
                {indice > 0 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIndice(0)}>
                    Voltar ao 1º
                  </Button>
                ) : proximo ? (
                  <Button type="button" variant="ghost" size="sm" onClick={usarProximo}>
                    Usar próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2">
                {ranking.slice(0, 5).map((item, itemIndex) => (
                  <button
                    key={`${item.motorista_id}-${itemIndex}`}
                    type="button"
                    onClick={() => setIndice(itemIndex)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      itemIndex === indice
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">#{itemIndex + 1} no ranking</p>
                        <p className="text-sm font-medium truncate">{item.motorista_nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Score {item.score_total}% · {item.justificativa.localizacao}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.justificativa.disponibilidade}
                        </p>
                        {item.localizacao_atual ? (
                          <p className="text-xs text-muted-foreground truncate">
                            Atual: {item.localizacao_atual}
                          </p>
                        ) : null}
                        {item.localizacao_prevista && item.localizacao_prevista !== item.localizacao_atual ? (
                          <p className="text-xs text-muted-foreground truncate">
                            Prevista: {item.localizacao_prevista}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={itemIndex === indice ? 'default' : 'outline'}>{item.compatibilidade}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

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
