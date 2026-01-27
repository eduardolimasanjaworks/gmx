import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface CriticalChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: FieldChange[];
  onConfirm: (reason: string) => void;
}

export const CriticalChangeConfirmDialog = ({
  open,
  onOpenChange,
  changes,
  onConfirm,
}: CriticalChangeConfirmDialogProps) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.length >= 10) {
      onConfirm(reason);
      setReason("");
    }
  };

  const fieldLabels: Record<string, string> = {
    cpf: "CPF",
    "metadata.antt.cnpj_cpf": "CNPJ/CPF do Proprietário (ANTT)",
    "metadata.antt.numero": "Número ANTT",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmação de Alteração Crítica
          </DialogTitle>
          <DialogDescription>
            Você está prestes a alterar campos críticos. Esta ação será registrada no histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-md p-4 space-y-3">
            <h4 className="font-semibold text-sm">Alterações detectadas:</h4>
            {changes.map((change, index) => (
              <div key={index} className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{fieldLabels[change.field] || change.field}:</span>
                <div className="grid grid-cols-2 gap-2 pl-4">
                  <div>
                    <span className="text-muted-foreground">Valor anterior:</span>
                    <p className="font-mono bg-muted p-2 rounded">{change.oldValue || "(vazio)"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Novo valor:</span>
                    <p className="font-mono bg-muted p-2 rounded">{change.newValue || "(vazio)"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-reason">
              Motivo da alteração (mínimo 10 caracteres) *
            </Label>
            <Textarea
              id="change-reason"
              placeholder="Descreva o motivo desta alteração crítica..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/10 caracteres mínimos
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={reason.length < 10}
          >
            Confirmar Alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
