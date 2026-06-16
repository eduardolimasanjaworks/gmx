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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Plus, Route } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useConfigRotas } from '@/hooks/useConfigRotas';
import { correlacionarEAtualizarEmbarque } from '@/lib/embarque-rota-service';
export interface EmbarqueRotaPendente {
  id: string | number;
  origin: string;
  destination: string;
  produto_predominante?: string | null;
  operacao?: string | null;
  config_rota_id?: number | null;
}

interface CorrelacionarRotaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendentes: EmbarqueRotaPendente[];
}

export function CorrelacionarRotaDialog({
  open,
  onOpenChange,
  pendentes,
}: CorrelacionarRotaDialogProps) {
  const queryClient = useQueryClient();
  const { rotas, createRota, isLoading: rotasLoading } = useConfigRotas();
  const [selecao, setSelecao] = useState<Record<string, string>>({});
  const [processando, setProcessando] = useState<string | null>(null);
  const [criarPara, setCriarPara] = useState<string | null>(null);
  const [novaRota, setNovaRota] = useState({
    origem: '',
    destino: '',
    operacao: '',
    valor_minimo: '',
    valor_maximo: '',
  });

  const associar = async (embarque: EmbarqueRotaPendente, rotaId: number) => {
    setProcessando(String(embarque.id));
    try {
      await correlacionarEAtualizarEmbarque(
        Number(embarque.id),
        embarque.origin,
        embarque.destination,
        {
          rotaIdManual: rotaId,
          configRotaIdAntes: embarque.config_rota_id ?? null,
          usuario: 'portal',
        },
      );
      toast.success('Rota associada ao embarque');
      queryClient.invalidateQueries({ queryKey: ['embarques'] });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao associar rota');
    } finally {
      setProcessando(null);
    }
  };

  const criarEAssociar = async (embarque: EmbarqueRotaPendente) => {
    if (!novaRota.origem || !novaRota.destino || !novaRota.valor_minimo || !novaRota.valor_maximo) {
      toast.error('Preencha origem, destino e valores min/máx');
      return;
    }
    setProcessando(String(embarque.id));
    try {
      await createRota({
        origem: novaRota.origem,
        destino: novaRota.destino,
        operacao: novaRota.operacao || undefined,
        valor_minimo: parseFloat(novaRota.valor_minimo),
        valor_maximo: parseFloat(novaRota.valor_maximo),
        ativo: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['config_rotas'] });
      const atualizadas = (await queryClient.fetchQuery({ queryKey: ['config_rotas'] })) as {
        id: number;
        origem: string;
        destino: string;
      }[];
      const criada = atualizadas.find(
        (r) =>
          r.origem === novaRota.origem &&
          r.destino === novaRota.destino,
      );
      if (criada) {
        await correlacionarEAtualizarEmbarque(
          Number(embarque.id),
          embarque.origin,
          embarque.destination,
          {
            rotaIdManual: criada.id,
            configRotaIdAntes: embarque.config_rota_id ?? null,
            usuario: 'portal',
          },
        );
      }
      toast.success('Rota criada e associada');
      setCriarPara(null);
      queryClient.invalidateQueries({ queryKey: ['embarques'] });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar rota');
    } finally {
      setProcessando(null);
    }
  };

  const abrirCriar = (embarque: EmbarqueRotaPendente) => {
    setCriarPara(String(embarque.id));
    setNovaRota({
      origem: embarque.origin ?? '',
      destino: embarque.destination ?? '',
      operacao: embarque.operacao ?? '',
      valor_minimo: '',
      valor_maximo: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Correlacionar rotas pendentes
          </DialogTitle>
          <DialogDescription>
            Embarques sem match em <strong>config_rotas</strong>. Associe uma rota existente ou
            cadastre uma nova antes de ofertar frete.
          </DialogDescription>
        </DialogHeader>

        {pendentes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum embarque com rota pendente.
          </p>
        ) : (
          <div className="space-y-4">
            {pendentes.map((emb) => (
              <div
                key={emb.id}
                className="border rounded-lg p-4 space-y-3 bg-muted/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {emb.origin} → {emb.destination}
                    </p>
                    {emb.produto_predominante && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Produto: {emb.produto_predominante}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    pendente
                  </Badge>
                </div>

                {criarPara === String(emb.id) ? (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div>
                      <Label className="text-xs">Origem</Label>
                      <Input
                        value={novaRota.origem}
                        onChange={(e) =>
                          setNovaRota((s) => ({ ...s, origem: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Destino</Label>
                      <Input
                        value={novaRota.destino}
                        onChange={(e) =>
                          setNovaRota((s) => ({ ...s, destino: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Operação</Label>
                      <Input
                        value={novaRota.operacao}
                        onChange={(e) =>
                          setNovaRota((s) => ({ ...s, operacao: e.target.value }))
                        }
                        placeholder="ARROZ, LATA..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Mín (R$)</Label>
                        <Input
                          type="number"
                          value={novaRota.valor_minimo}
                          onChange={(e) =>
                            setNovaRota((s) => ({ ...s, valor_minimo: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Máx (R$)</Label>
                        <Input
                          type="number"
                          value={novaRota.valor_maximo}
                          onChange={(e) =>
                            setNovaRota((s) => ({ ...s, valor_maximo: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => criarEAssociar(emb)}
                        disabled={processando === String(emb.id)}
                      >
                        {processando === String(emb.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Salvar rota e associar'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCriarPara(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={selecao[String(emb.id)] ?? ''}
                      onValueChange={(v) =>
                        setSelecao((s) => ({ ...s, [String(emb.id)]: v }))
                      }
                      disabled={rotasLoading}
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Selecionar rota existente" />
                      </SelectTrigger>
                      <SelectContent>
                        {rotas.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.origem} → {r.destino}
                            {r.operacao ? ` (${r.operacao})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={
                        !selecao[String(emb.id)] || processando === String(emb.id)
                      }
                      onClick={() =>
                        associar(emb, parseInt(selecao[String(emb.id)], 10))
                      }
                    >
                      {processando === String(emb.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Associar'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirCriar(emb)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Nova rota
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
