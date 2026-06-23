/**
 * Dialogo de revisao lado a lado do arquivo original, sugestao e valor atual.
 * Permite aceite total ou parcial por campo antes de gravar no cadastro.
 * Mantem a aprovacao humana explicita e auditavel.
 */
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildSuggestionDiffRows,
  type DriverAiDiffRow,
} from "@/components/driver/DriverAiSuggestionDiff";
import type { SugestaoOcr } from "@/components/driver/DriverAiSuggestionModels";

interface DriverAiSuggestionReviewDialogProps {
  open: boolean;
  item: SugestaoOcr | null;
  currentMotorista: Record<string, unknown>;
  currentDocumento: Record<string, unknown>;
  reviewerLabel: string;
  working: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedKeys: string[]) => void;
}

function currentText(value: string): string {
  return value || "vazio";
}

export function DriverAiSuggestionReviewDialog({
  open,
  item,
  currentMotorista,
  currentDocumento,
  reviewerLabel,
  working,
  onOpenChange,
  onConfirm,
}: DriverAiSuggestionReviewDialogProps) {
  const rows = useMemo<DriverAiDiffRow[]>(
    () => item
      ? buildSuggestionDiffRows({
          currentMotorista,
          currentDocumento,
          sugestaoMotorista: item.sugestao_motorista,
          sugestaoDocumento: item.sugestao_documento,
        })
      : [],
    [item, currentMotorista, currentDocumento],
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setSelected(Object.fromEntries(rows.map((row) => [row.key, true])));
  }, [open, item?.id, rows]);

  const selectedKeys = rows.filter((row) => selected[row.key]).map((row) => row.key);

  function setAll(value: boolean) {
    setSelected(Object.fromEntries(rows.map((row) => [row.key, value])));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw]">
        <DialogHeader>
          <DialogTitle>Revisar sugestao OCR</DialogTitle>
          <DialogDescription>
            Revise o arquivo original, selecione os campos desejados e aplique apenas o que fizer sentido.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Arquivo original</div>
              {item?.link && (
                <Button variant="outline" size="sm" onClick={() => window.open(item.link, "_blank")}>
                  Abrir em nova aba
                </Button>
              )}
            </div>
            <div className="rounded-md border bg-muted/20 overflow-hidden">
              {item?.link ? (
                <iframe title={`arquivo-${item.id}`} src={item.link} className="h-[60vh] w-full bg-white" />
              ) : (
                <div className="p-4 text-sm text-muted-foreground">Arquivo original indisponivel.</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Sugestao da IA</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAll(true)}>Tudo</Button>
                <Button variant="outline" size="sm" onClick={() => setAll(false)}>Nada</Button>
              </div>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {rows.length === 0 && (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  Nao ha diferencas reais para aplicar nesta sugestao.
                </div>
              )}
              {rows.map((row) => (
                <label key={row.key} className="flex gap-3 rounded-md border p-3 cursor-pointer">
                  <Checkbox
                    checked={!!selected[row.key]}
                    onCheckedChange={(value) => setSelected((prev) => ({ ...prev, [row.key]: !!value }))}
                  />
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{row.escopo}</Badge>
                      <span className="font-medium">{row.campo}</span>
                    </div>
                    <div>{row.sugerido}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Valor atual no GMX</div>
            <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {rows.length === 0 && (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  Os valores atuais ja batem com a sugestao.
                </div>
              )}
              {rows.map((row) => (
                <div key={`current-${row.key}`} className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{row.escopo}</Badge>
                    <span className="font-medium">{row.campo}</span>
                  </div>
                  <div className="text-muted-foreground">{currentText(row.atual)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="items-center">
          <div className="mr-auto text-xs text-muted-foreground">Revisor: {reviewerLabel}</div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={working || selectedKeys.length === 0} onClick={() => onConfirm(selectedKeys)}>
            Aplicar selecionados ({selectedKeys.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
