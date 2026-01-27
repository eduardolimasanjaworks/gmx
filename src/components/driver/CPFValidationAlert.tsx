import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

interface CPFValidationAlertProps {
  isValid: boolean;
  forceCorrection: boolean;
  correctionReason: string;
  onForceChange: (checked: boolean) => void;
  onReasonChange: (reason: string) => void;
}

export const CPFValidationAlert = ({
  isValid,
  forceCorrection,
  correctionReason,
  onForceChange,
  onReasonChange,
}: CPFValidationAlertProps) => {
  if (isValid) return null;

  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>CPF inválido!</strong> O CPF digitado não passou na validação de dígitos verificadores.
        </AlertDescription>
      </Alert>

      <div className="space-y-3 p-4 border border-destructive/50 rounded-md bg-destructive/5">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="force-cpf"
            checked={forceCorrection}
            onCheckedChange={onForceChange}
          />
          <Label htmlFor="force-cpf" className="text-sm font-medium cursor-pointer">
            Forçar correção/aceitação de CPF inválido
          </Label>
        </div>

        {forceCorrection && (
          <div className="space-y-2">
            <Label htmlFor="correction-reason" className="text-sm font-medium">
              Motivo da correção (obrigatório) *
            </Label>
            <Textarea
              id="correction-reason"
              placeholder="Descreva o motivo para aceitar este CPF inválido..."
              value={correctionReason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="min-h-[80px]"
              required={forceCorrection}
            />
            <p className="text-xs text-muted-foreground">
              Este motivo será registrado no histórico de alterações.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
