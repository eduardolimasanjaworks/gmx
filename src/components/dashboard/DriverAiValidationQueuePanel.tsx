/**
 * Painel global de validacao documental gerada pela IA.
 * Fica na aba de cadastros para a equipe revisar pendencias do onboarding.
 * Evita depender de abrir o perfil de cada motorista para descobrir pendencias.
 */
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, ArrowRight, FileSearch, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDriverAiValidationQueue } from '@/hooks/useDriverAiValidationQueue';

interface Props {
  onOpenDriver: (driver: { id?: number; nome?: string | null; telefone?: string | null }) => void;
}

function textoRelativo(date?: string | null): string {
  if (!date) return 'sem data';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'sem data';
  return formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR });
}

function formatarTipo(tipo?: string | null): string {
  return String(tipo || 'documento')
    .replace(/_/g, ' ')
    .trim();
}

function formatarDestino(destino?: string | null): string {
  return String(destino || 'sem destino')
    .replace(/_/g, ' ')
    .trim();
}

export function DriverAiValidationQueuePanel({ onOpenDriver }: Props) {
  const { data = [], isLoading, refetch, isFetching } = useDriverAiValidationQueue();

  return (
    <Card className="border-amber-200/70 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              Validação de Documento Vinda da IA
              <Badge variant="secondary">{data.length}</Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Pendências de OCR e revisão documental para cadastro, sem sair desta aba.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">Carregando pendências da IA...</div>}
        {!isLoading && data.length === 0 && (
          <div className="rounded-md border border-dashed bg-background/60 px-4 py-5 text-sm text-muted-foreground">
            Nenhuma validação documental pendente no momento.
          </div>
        )}
        {data.map((item: any) => {
          const motorista =
            typeof item.motorista_id === 'object' && item.motorista_id ? item.motorista_id : null;
          const nome = item.nome_motorista || 'Motorista sem nome';
          const telefone = motorista?.telefone || null;
          const confianca =
            typeof item.confidence_score === 'number' && Number.isFinite(item.confidence_score)
              ? `${Math.round(item.confidence_score * 100)}%`
              : 'sem score';
          return (
            <div
              key={item.id}
              className="rounded-lg border bg-background/90 p-3 shadow-sm transition-colors hover:bg-background"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{nome}</span>
                    <Badge variant="secondary">{formatarTipo(item.tipo_documento)}</Badge>
                    <Badge variant="outline">{formatarDestino(item.colecao_destino)}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{telefone || 'telefone nao informado'}</span>
                    <span>Criado {textoRelativo(item.date_created)}</span>
                    <span>Confianca {confianca}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    onOpenDriver({
                      id: motorista?.id,
                      nome: motorista?.nome || nome,
                      telefone,
                    })
                  }
                >
                  Revisar cadastro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {data.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-100/50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            A revisão continua no perfil do motorista; aqui a equipe enxerga a fila global sem precisar caçar pendências manualmente.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
