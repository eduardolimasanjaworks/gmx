import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  desmarcarGrFeito,
  formatarGrFeitoEm,
  marcarGrFeito,
  type DadosGrEmbarque,
} from '@/lib/embarque-gr-service';

interface EmbarqueGrCheckboxProps {
  embarqueId: string | number;
  grFeito?: boolean | null;
  grFeitoEm?: string | null;
  grFeitoPorNome?: string | null;
  compact?: boolean;
  onAtualizado?: (dados: DadosGrEmbarque) => void;
}

function nomeAtendente(user: {
  first_name?: string;
  last_name?: string;
  email?: string;
} | null): string {
  if (!user) return 'Atendente';
  const nome = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return nome || user.email || 'Atendente';
}

export function EmbarqueGrCheckbox({
  embarqueId,
  grFeito,
  grFeitoEm,
  grFeitoPorNome,
  compact = false,
  onAtualizado,
}: EmbarqueGrCheckboxProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [motivo, setMotivo] = useState('');

  const atendente = {
    id: String(user?.id ?? ''),
    nome: nomeAtendente(user),
  };

  const mutation = useMutation({
    mutationFn: async (acao: 'marcar' | 'desmarcar') => {
      if (!user?.id) throw new Error('Faça login para registrar o GR');
      if (acao === 'marcar') {
        return marcarGrFeito(embarqueId, atendente);
      }
      return desmarcarGrFeito(embarqueId, atendente, motivo);
    },
    onSuccess: (dados) => {
      queryClient.setQueryData<any[]>(['embarques'], (old = []) =>
        old.map((item) =>
          String(item.id) === String(embarqueId)
            ? {
                ...item,
                gr_feito: dados.gr_feito,
                gr_feito_em: dados.gr_feito_em,
                gr_feito_por_nome: dados.gr_feito_por_nome,
                gr_feito_por_id: dados.gr_feito_por_id,
              }
            : item,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ['embarques'] });
      onAtualizado?.(dados);
      setDialogAberto(false);
      setMotivo('');
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Não foi possível atualizar o GR',
        description: err.message || 'Tente novamente',
      });
    },
  });

  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    if (mutation.isPending) return;

    if (checked === true) {
      mutation.mutate('marcar');
      return;
    }

    if (grFeito) {
      setMotivo('');
      setDialogAberto(true);
    }
  };

  const confirmarDesmarcar = () => {
    if (!motivo.trim()) {
      toast({
        variant: 'destructive',
        title: 'Motivo obrigatório',
        description: 'Informe por que o GR está sendo desmarcado — fica registrado no histórico.',
      });
      return;
    }
    mutation.mutate('desmarcar');
  };

  const dataFormatada = formatarGrFeitoEm(grFeitoEm);

  return (
    <>
      <div
        className={`flex ${compact ? 'flex-col gap-1' : 'items-start gap-2'} rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-2`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            id={`gr-feito-${embarqueId}`}
            checked={!!grFeito}
            disabled={mutation.isPending || !user}
            onCheckedChange={handleCheckedChange}
          />
          <Label
            htmlFor={`gr-feito-${embarqueId}`}
            className="text-[11px] font-medium leading-none cursor-pointer"
          >
            Feito GR
          </Label>
          {mutation.isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        {grFeito && (grFeitoPorNome || dataFormatada) && (
          <p className="text-[10px] text-muted-foreground pl-6">
            {grFeitoPorNome ? `por ${grFeitoPorNome}` : ''}
            {grFeitoPorNome && dataFormatada ? ' · ' : ''}
            {dataFormatada ? `em ${dataFormatada}` : ''}
          </p>
        )}
      </div>

      <AlertDialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Desmarcar Feito GR</AlertDialogTitle>
            <AlertDialogDescription>
              O desmarcar fica registrado no histórico com seu nome e o motivo informado.
              {grFeitoPorNome && dataFormatada && (
                <span className="mt-2 block text-foreground">
                  Marcado por {grFeitoPorNome} em {dataFormatada}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo do desmarcar (obrigatório)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmarDesmarcar}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando…
                </>
              ) : (
                'Desmarcar e registrar histórico'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
