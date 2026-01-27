import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface HistoryEntry {
  action: "create" | "update" | "delete";
  user_email: string;
  user_id: string;
  timestamp: string;
  changes?: Array<{
    field: string;
    old: string;
    new: string;
  }>;
  reason?: string;
}

interface DriverHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string;
  history: HistoryEntry[];
}

export const DriverHistoryDialog = ({
  open,
  onOpenChange,
  driverName,
  history,
}: DriverHistoryDialogProps) => {
  const exportToCSV = () => {
    const csvHeader = "Data/Hora,Usuário,Ação,Campo,Valor Antigo,Novo Valor,Motivo\n";
    const csvRows = history.flatMap((entry) => {
      const baseInfo = `${format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })},${entry.user_email},${entry.action}`;
      
      if (entry.changes && entry.changes.length > 0) {
        return entry.changes.map((change) =>
          `${baseInfo},${change.field},"${change.old || ''}","${change.new || ''}","${entry.reason || ''}"`
        );
      }
      
      return `${baseInfo},-,-,-,"${entry.reason || ''}"`;
    });

    const csvContent = csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historico_${driverName.replace(/\s+/g, "_")}_${Date.now()}.csv`;
    link.click();

    toast({
      title: "Histórico exportado",
      description: "O arquivo CSV foi baixado com sucesso.",
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: "Criação",
      update: "Atualização",
      delete: "Exclusão",
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      create: "text-green-600",
      update: "text-blue-600",
      delete: "text-red-600",
    };
    return colors[action] || "text-gray-600";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações - {driverName}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum histórico disponível.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${getActionColor(entry.action)}`}>
                        {getActionLabel(entry.action)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      por {entry.user_email}
                    </span>
                  </div>

                  {entry.changes && entry.changes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h5 className="text-sm font-medium">Campos alterados:</h5>
                      {entry.changes.map((change, changeIndex) => (
                        <div key={changeIndex} className="bg-muted p-3 rounded text-sm space-y-1">
                          <div className="font-medium">{change.field}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Anterior:</span>
                              <span className="ml-2 font-mono">{change.old || "(vazio)"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Novo:</span>
                              <span className="ml-2 font-mono">{change.new || "(vazio)"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {entry.reason && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Motivo:</span>
                      <p className="text-muted-foreground mt-1">{entry.reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
