import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { RotaRegrasOperacionais } from '@/lib/rotaRegras';
import { parseRotaRegras, stringifyRotaRegras } from '@/lib/rotaRegras';

export type RotaRegrasDraft = {
  preferencia_proximidade: 'coleta' | 'agora';
  gps_max_horas: string;
  passo_negociacao_modo: 'proporcional' | 'fixo';
  passo_negociacao_valor: string;
};

export const EMPTY_REGRAS_DRAFT: RotaRegrasDraft = {
  preferencia_proximidade: 'coleta',
  gps_max_horas: '24',
  passo_negociacao_modo: 'proporcional',
  passo_negociacao_valor: '100',
};

export function regrasDraftFromEvidence(raw?: string | null): RotaRegrasDraft {
  const regras = parseRotaRegras(raw);
  return {
    preferencia_proximidade: regras.preferencia_proximidade === 'agora' ? 'agora' : 'coleta',
    gps_max_horas: String(regras.gps_max_horas ?? 24),
    passo_negociacao_modo: regras.passo_negociacao_modo === 'fixo' ? 'fixo' : 'proporcional',
    passo_negociacao_valor: String(regras.passo_negociacao_valor ?? 100),
  };
}

export function rulesDraftToEvidence(draft: RotaRegrasDraft): string {
  const payload: RotaRegrasOperacionais = {
    preferencia_proximidade: draft.preferencia_proximidade,
    gps_max_horas: Number(draft.gps_max_horas),
    passo_negociacao_modo: draft.passo_negociacao_modo,
    passo_negociacao_valor: Number(draft.passo_negociacao_valor),
  };
  return stringifyRotaRegras(payload);
}

export function resumoRegrasRota(raw?: string | null): string {
  const regras = parseRotaRegras(raw);
  const proximidade = regras.preferencia_proximidade === 'agora' ? 'proximidade agora' : 'proximidade na coleta';
  const gps = `${regras.gps_max_horas ?? 24}h de GPS`;
  const passo =
    regras.passo_negociacao_modo === 'fixo'
      ? `passo fixo R$ ${Number(regras.passo_negociacao_valor ?? 100).toLocaleString('pt-BR')}`
      : 'passo proporcional';
  return `${proximidade} · ${gps} · ${passo}`;
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
      </div>
    </div>
  );
}

