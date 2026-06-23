/**
 * Lista enxuta de arquivos originais enviados pelo motorista via WhatsApp.
 * Mantem o acesso rapido ao asset salvo no Directus e a exclusao operacional.
 * Fica separado do painel principal para reduzir acoplamento visual.
 */
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import type { ArquivoOriginal } from "@/components/driver/DriverAiSuggestionModels";

interface DriverAiOriginalFilesListProps {
  arquivos: ArquivoOriginal[];
  workingId: string;
  onDelete: (item: ArquivoOriginal) => void;
}

export function DriverAiOriginalFilesList({
  arquivos,
  workingId,
  onDelete,
}: DriverAiOriginalFilesListProps) {
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="text-sm font-semibold">Arquivos originais recebidos</div>
      {arquivos.length === 0 && (
        <div className="text-sm text-muted-foreground">Nenhum arquivo original salvo para este motorista.</div>
      )}
      {arquivos.map((item) => (
        <div key={item.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{item.nome_arquivo || `arquivo_${item.id}`}</div>
            <div className="text-xs text-muted-foreground">
              {item.tipo_documento || "documento"} {item.mime_type ? `| ${item.mime_type}` : ""}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {item.link && (
              <Button variant="outline" size="sm" onClick={() => window.open(item.link, "_blank")}>
                Abrir
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(item)}
              disabled={!!workingId}
            >
              {workingId === `apagar-${item.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
