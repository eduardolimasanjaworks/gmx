import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileSpreadsheet, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useFollow } from "@/hooks/useFollow";
import { parseCsvRows, csvRowsToFollowPayload } from "@/lib/csvFollowParser";
import { criarEmbarquesDoCsv } from "@/lib/embarque-rota-service";

export type CsvImportMode = "follow" | "embarques";

interface CsvImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** follow = aba Follow; embarques = kanban com correlacao de rota */
    mode?: CsvImportMode;
}

export function CsvImportDialog({ open, onOpenChange, mode = "follow" }: CsvImportDialogProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { importFollow } = useFollow();
    const queryClient = useQueryClient();

    const isEmbarques = mode === "embarques";

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    };

    const handleFileSelection = (file: File) => {
        if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
            toast.error("Formato inválido", {
                description: "Por favor, selecione um arquivo formato CSV."
            });
            return;
        }
        setSelectedFile(file);
    };

    const processFile = () => {
        if (!selectedFile) return;
        setIsProcessing(true);

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            skipFirstNLines: 0,
            transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
            complete: async (results) => {
                try {
                    const rows = results.data as Record<string, unknown>[];

                    if (rows.length === 0) {
                        toast.error("Arquivo vazio", {
                            description: "O arquivo CSV não contém dados válidos."
                        });
                        setIsProcessing(false);
                        return;
                    }

                    const parsed = parseCsvRows(rows);

                    if (isEmbarques) {
                        const stats = await criarEmbarquesDoCsv(parsed, { usuario: "portal" });
                        await queryClient.invalidateQueries({ queryKey: ["embarques"] });
                        toast.success("Embarques importados!", {
                            description: `${stats.total} linhas — ${stats.correlacionados} com rota, ${stats.pendentes} pendentes de correlação.`,
                        });
                    } else {
                        const lotToInsert = csvRowsToFollowPayload(parsed);
                        await importFollow(lotToInsert);
                        toast.success("Importação concluída!", {
                            description: `${rows.length} registros importados com sucesso.`
                        });
                    }
                    closeDialog();
                } catch (error: unknown) {
                    console.error("Erro na importação:", error);
                    const err = error as { errors?: { message?: string }[]; message?: string };
                    toast.error("Erro ao importar", {
                        description: err?.errors?.[0]?.message || err?.message || "Não foi possível salvar. Veja o console."
                    });
                } finally {
                    setIsProcessing(false);
                }
            },
            error: (error) => {
                console.error("Papa Parse Error:", error);
                toast.error("Falha ao ler o arquivo", { description: error.message });
                setIsProcessing(false);
            }
        });
    };

    const closeDialog = () => {
        setSelectedFile(null);
        setIsProcessing(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={closeDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEmbarques ? "Importar Embarques (CSV)" : "Importar Follow (CSV)"}
                    </DialogTitle>
                    <DialogDescription>
                        Colunas esperadas: <strong>Pedido, Origem, Destino, UF, Cliente, TP, Produto</strong>
                        {isEmbarques && (
                            <> — cada linha vira um card no kanban com correlação automática de rota.</>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-4">
                    {!selectedFile ? (
                        <div
                            className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center space-y-4 cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="p-3 bg-muted rounded-full">
                                <Upload className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">Clique ou arraste o arquivo aqui</p>
                                <p className="text-xs text-muted-foreground mt-1">Somente arquivos .csv</p>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv, text/csv" onChange={handleFileChange} />
                        </div>
                    ) : (
                        <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                            <div className="flex items-center space-x-3 overflow-hidden">
                                <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                                    <FileSpreadsheet className="h-5 w-5" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} disabled={isProcessing} className="shrink-0 ml-2">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={closeDialog} disabled={isProcessing}>Cancelar</Button>
                    <Button onClick={processFile} disabled={!selectedFile || isProcessing} className="w-full sm:w-auto">
                        {isProcessing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</>
                        ) : "Importar Dados"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
