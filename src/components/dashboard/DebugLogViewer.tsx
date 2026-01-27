
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bug, Clipboard, Trash2, RefreshCw } from "lucide-react";
import { Logger, LogEntry } from "@/lib/logger";
import { toast } from "sonner";

export function DebugLogViewer() {
    const [open, setOpen] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const refreshLogs = () => {
        setLogs(Logger.getLogs());
    };

    useEffect(() => {
        if (open) refreshLogs();
    }, [open]);

    const copyLogs = () => {
        const text = JSON.stringify(logs, null, 2);
        navigator.clipboard.writeText(text);
        toast.success("Logs copiados para a área de transferência");
    };

    const clearLogs = () => {
        Logger.clear();
        refreshLogs();
        toast.info("Logs limpos");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" title="Logs de Sistema">
                    <Bug className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>Diagnóstico do Sistema</span>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={refreshLogs}>
                                <RefreshCw className="h-3 w-3 mr-2" /> Atualizar
                            </Button>
                            <Button size="sm" variant="outline" onClick={copyLogs}>
                                <Clipboard className="h-3 w-3 mr-2" /> Copiar Tudo
                            </Button>
                            <Button size="sm" variant="destructive" onClick={clearLogs}>
                                <Trash2 className="h-3 w-3 mr-2" /> Limpar
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="bg-muted p-2 rounded text-xs font-mono mb-2">
                    Total de Logs: {logs.length}
                </div>

                <ScrollArea className="flex-1 border rounded bg-slate-950 text-slate-50 p-4 font-mono text-xs">
                    {logs.length === 0 ? (
                        <div className="text-center text-slate-500 py-10">Nenhum log registrado.</div>
                    ) : (
                        logs.map((log, idx) => (
                            <div key={idx} className="mb-4 border-b border-slate-800 pb-2 last:border-0">
                                <div className="flex gap-2 mb-1">
                                    <span className="text-slate-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className={`font-bold ${log.level === 'ERROR' ? 'text-red-400' :
                                            log.level === 'WARN' ? 'text-yellow-400' : 'text-blue-400'
                                        }`}>
                                        {log.level}
                                    </span>
                                    <span className="text-slate-200">{log.message}</span>
                                </div>
                                {log.details && (
                                    <pre className="ml-6 text-slate-500 overflow-x-auto whitespace-pre-wrap">
                                        {log.details}
                                    </pre>
                                )}
                            </div>
                        ))
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
