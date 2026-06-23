/**
 * Historico resumido de sugestoes OCR ja revisadas pela equipe.
 * Exibe quem revisou, quando e quantos campos foram aplicados ou recusados.
 * Ajuda a auditar o fluxo sem poluir a lista de pendencias.
 */
import { Badge } from "@/components/ui/badge";
import type { SugestaoOcr } from "@/components/driver/DriverAiSuggestionModels";
import { parseSuggestionJson } from "@/components/driver/DriverAiSuggestionDiff";

interface DriverAiSuggestionHistoryProps {
  sugestoes: SugestaoOcr[];
}

function countFields(value?: string): number {
  return Object.keys(parseSuggestionJson(value)).length;
}

function parseList(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function DriverAiSuggestionHistory({ sugestoes }: DriverAiSuggestionHistoryProps) {
  const historico = sugestoes
    .filter((item) => item.status && item.status !== "pendente")
    .sort((a, b) => String(b.revisada_em || b.date_created || "").localeCompare(String(a.revisada_em || a.date_created || "")))
    .slice(0, 8);

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="text-sm font-semibold">Historico de revisoes</div>
      {historico.length === 0 && (
        <div className="text-sm text-muted-foreground">Nenhuma sugestao revisada ainda.</div>
      )}
      {historico.map((item) => {
        const aplicados = parseList(item.campos_aplicados);
        const rejeitados = parseList(item.campos_rejeitados);
        return (
          <div key={item.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{item.tipo_documento || "documento"}</Badge>
              <Badge variant="outline">{item.status || "revisada"}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Revisado por {item.revisada_por_nome || item.revisada_por_email || "equipe"} em {item.revisada_em || item.date_created || "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              Aplicados: {aplicados.length || countFields(item.sugestao_motorista) + countFields(item.sugestao_documento)}
              {" | "}
              Rejeitados: {rejeitados.length}
            </div>
          </div>
        );
      })}
    </div>
  );
}
