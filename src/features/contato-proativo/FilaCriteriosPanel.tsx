import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { CriteriosGeracao } from '@/services/iagmxContatoProativoService';

interface Props {
  criterios: CriteriosGeracao;
  onChange: (c: CriteriosGeracao) => void;
  onRegerar: () => void;
  busy: boolean;
  diasCoberturaEstimado: number | null;
  totalMotoristas: number;
}

export function FilaCriteriosPanel({
  criterios, onChange, onRegerar, busy, diasCoberturaEstimado, totalMotoristas,
}: Props) {
  const [aberto, setAberto] = useState(false);

  const set = (key: keyof CriteriosGeracao, val: unknown) =>
    onChange({ ...criterios, [key]: val });

  return (
    <div className="rounded-lg border bg-muted/30">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Criterios de sugestao
          {diasCoberturaEstimado != null && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              cobertura estimada: {diasCoberturaEstimado} dia(s) para {totalMotoristas} motoristas
            </span>
          )}
        </span>
        {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {aberto && (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Limite de sugestoes por lote</Label>
              <Input
                type="number"
                min={1}
                max={2000}
                value={criterios.limite ?? 300}
                onChange={(e) => set('limite', Math.max(1, Number(e.target.value)))}
              />
              <p className="text-xs text-muted-foreground">Quantos motoristas gerar por rodada</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Janela: em carga (horas)</Label>
              <Input
                type="number"
                min={1}
                value={criterios.janela_em_carga_horas ?? 24}
                onChange={(e) => set('janela_em_carga_horas', Math.max(1, Number(e.target.value)))}
              />
              <p className="text-xs text-muted-foreground">Intervalo minimo entre contatos para motoristas em viagem</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Janela: disponivel (horas)</Label>
              <Input
                type="number"
                min={1}
                value={criterios.janela_padrao_horas ?? 72}
                onChange={(e) => set('janela_padrao_horas', Math.max(1, Number(e.target.value)))}
              />
              <p className="text-xs text-muted-foreground">Intervalo minimo para motoristas fora de carga</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Considerar compromissos futuros</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={criterios.considerar_compromissos_futuros ?? false}
                  onCheckedChange={(v) => set('considerar_compromissos_futuros', v)}
                />
                <span className="text-xs text-muted-foreground">
                  {criterios.considerar_compromissos_futuros
                    ? 'Motoristas com previsao de retorno sao ignorados'
                    : 'Ignora previsao de retorno ao ranquear'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={onRegerar} disabled={busy} size="sm" variant="outline">
              Aplicar e regenerar fila
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
