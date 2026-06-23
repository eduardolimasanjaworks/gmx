/**
 * Diff visual entre valores atuais do GMX e sugestoes geradas pela IA.
 * Mostra apenas campos realmente alterados para acelerar o aceite humano.
 * Mantem a revisao simples, legivel e deterministica.
 */
import { Badge } from "@/components/ui/badge";

export interface DriverAiDiffRow {
  key: string;
  escopo: "Motorista" | "Documento";
  campo: string;
  atual: string;
  sugerido: string;
}

interface DriverAiSuggestionDiffProps {
  currentMotorista?: Record<string, unknown>;
  currentDocumento?: Record<string, unknown>;
  sugestaoMotorista?: string;
  sugestaoDocumento?: string;
}

export function parseSuggestionJson(value?: string): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function montarLinhas(
  escopo: "Motorista" | "Documento",
  atual: Record<string, unknown>,
  sugestao: Record<string, unknown>,
): DriverAiDiffRow[] {
  return Object.entries(sugestao)
    .map(([campo, valor]) => ({
      key: `${escopo}.${campo}`,
      escopo,
      campo,
      atual: asText(atual?.[campo]),
      sugerido: asText(valor),
    }))
    .filter((item) => item.sugerido && item.atual !== item.sugerido);
}

export function buildSuggestionDiffRows(input: {
  currentMotorista?: Record<string, unknown>;
  currentDocumento?: Record<string, unknown>;
  sugestaoMotorista?: string;
  sugestaoDocumento?: string;
}): DriverAiDiffRow[] {
  return [
    ...montarLinhas("Motorista", input.currentMotorista || {}, parseSuggestionJson(input.sugestaoMotorista)),
    ...montarLinhas("Documento", input.currentDocumento || {}, parseSuggestionJson(input.sugestaoDocumento)),
  ];
}

export function DriverAiSuggestionDiff({
  currentMotorista,
  currentDocumento,
  sugestaoMotorista,
  sugestaoDocumento,
}: DriverAiSuggestionDiffProps) {
  const linhas = buildSuggestionDiffRows({
    currentMotorista,
    currentDocumento,
    sugestaoMotorista,
    sugestaoDocumento,
  });

  if (!linhas.length) {
    return <div className="text-xs text-muted-foreground">Nenhuma diferenca detectada; a sugestao coincide com o valor atual ou esta vazia.</div>;
  }

  return (
    <div className="space-y-2">
      {linhas.map((linha) => (
        <div key={`${linha.escopo}-${linha.campo}-${linha.sugerido}`} className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{linha.escopo}</Badge>
            <span className="font-medium">{linha.campo}</span>
          </div>
          <div className="text-muted-foreground">Atual: {linha.atual || "vazio"}</div>
          <div>Sugerido: {linha.sugerido}</div>
        </div>
      ))}
    </div>
  );
}
