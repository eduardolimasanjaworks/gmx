import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { RotaRegrasOperacionais, RotaRegrasSource } from '@/lib/rotaRegras';
import { parseRotaRegras } from '@/lib/rotaRegras';

export type RotaRegrasDraft = {
  preferencia_proximidade: 'coleta' | 'agora';
  gps_max_horas: string;
  passo_negociacao_modo: 'proporcional' | 'fixo';
  passo_negociacao_valor: string;
  escalar_humano_no_teto: boolean;
};

export const EMPTY_REGRAS_DRAFT: RotaRegrasDraft = {
  preferencia_proximidade: 'coleta',
  gps_max_horas: '24',
  passo_negociacao_modo: 'proporcional',
  passo_negociacao_valor: '100',
  escalar_humano_no_teto: true,
};

export function regrasDraftFromSource(source?: RotaRegrasSource | null): RotaRegrasDraft {
  const regras = parseRotaRegras(source);
  return {
    preferencia_proximidade: regras.preferencia_proximidade === 'agora' ? 'agora' : 'coleta',
    gps_max_horas: String(regras.gps_max_horas ?? 24),
    passo_negociacao_modo: regras.passo_negociacao_modo === 'fixo' ? 'fixo' : 'proporcional',
    passo_negociacao_valor: String(regras.passo_negociacao_valor ?? 100),
    escalar_humano_no_teto: regras.escalar_humano_no_teto !== false,
  };
}

export function rulesDraftToFields(draft: RotaRegrasDraft): RotaRegrasOperacionais {
  return {
    preferencia_proximidade: draft.preferencia_proximidade,
    gps_max_horas: Number(draft.gps_max_horas),
    passo_negociacao_modo: draft.passo_negociacao_modo,
    passo_negociacao_valor: Number(draft.passo_negociacao_valor),
    escalar_humano_no_teto: draft.escalar_humano_no_teto,
  };
}

export function resumoRegrasRota(source?: RotaRegrasSource | null): string {
  const regras = parseRotaRegras(source);
  const proximidade = regras.preferencia_proximidade === 'agora' ? 'proximidade agora' : 'proximidade na coleta';
  const gps = `${regras.gps_max_horas ?? 24}h de GPS`;
  const passo =
    regras.passo_negociacao_modo === 'fixo'
      ? `passo fixo R$ ${Number(regras.passo_negociacao_valor ?? 100).toLocaleString('pt-BR')}`
      : 'passo proporcional';
  const humano = regras.escalar_humano_no_teto === false ? 'sem escalar no teto' : 'escala humano no teto';
  return `${proximidade} · ${gps} · ${passo} · ${humano}`;
}

export function RotaOperationalRulesCard(props: {
  title?: string;
  description?: string;
  draft: RotaRegrasDraft;
  onChange: (next: RotaRegrasDraft) => void;
}) {
  const { title = 'Regras operacionais da rota', description, draft, onChange } = props;
  const set = (patch: Partial<RotaRegrasDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className="rounded-lg border border-indigo-200/70 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          {description ?? 'Define como a rota prioriza motorista, tolera GPS antigo e sobe a negociação antes de escalar humano.'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-xs">Prioridade de proximidade</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={draft.preferencia_proximidade === 'coleta' ? 'default' : 'outline'}
              onClick={() => set({ preferencia_proximidade: 'coleta' })}
            >
              Na coleta
            </Button>
            <Button
              type="button"
              size="sm"
              variant={draft.preferencia_proximidade === 'agora' ? 'default' : 'outline'}
              onClick={() => set({ preferencia_proximidade: 'agora' })}
            >
              Agora
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            `Na coleta` usa a localização prevista quando houver data e cidade futura confiáveis.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">GPS máximo aceito (horas)</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={draft.gps_max_horas}
            onChange={(e) => set({ gps_max_horas: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground">
            Acima desse limite o ranking derruba confiança do último GPS do motorista.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Degrau da negociação</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={draft.passo_negociacao_modo === 'proporcional' ? 'default' : 'outline'}
              onClick={() => set({ passo_negociacao_modo: 'proporcional' })}
            >
              Proporcional
            </Button>
            <Button
              type="button"
              size="sm"
              variant={draft.passo_negociacao_modo === 'fixo' ? 'default' : 'outline'}
              onClick={() => set({ passo_negociacao_modo: 'fixo' })}
            >
              Fixo
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            `Fixo` sobe sempre no mesmo valor. `Proporcional` usa o tamanho da faixa da rota.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Passo fixo (R$)</Label>
          <Input
            type="number"
            min={50}
            step={50}
            value={draft.passo_negociacao_valor}
            onChange={(e) => set({ passo_negociacao_valor: e.target.value })}
            disabled={draft.passo_negociacao_modo !== 'fixo'}
          />
          <p className="text-[11px] text-muted-foreground">
            Ao bater o teto, a regra continua escalando para humano. O sistema não recusa sozinho.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Escalonamento no teto</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={draft.escalar_humano_no_teto ? 'default' : 'outline'}
              onClick={() => set({ escalar_humano_no_teto: true })}
            >
              Escalar humano
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!draft.escalar_humano_no_teto ? 'default' : 'outline'}
              onClick={() => set({ escalar_humano_no_teto: false })}
            >
              Fechar na IA
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Define se o teto obrigatoriamente vira caso humano ou se a IA pode encerrar no valor maximo.
          </p>
        </div>
      </div>
    </div>
  );
}
