import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileSpreadsheet, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useEmbarques } from "@/hooks/useEmbarques";

interface CsvImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { createEmbarquesBatch } = useEmbarques();

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
            complete: async (results) => {
                try {
                    const rows = results.data as any[];

                    if (rows.length === 0) {
                        toast.error("Arquivo vazio", {
                            description: "O arquivo CSV não contém dados válidos."
                        });
                        setIsProcessing(false);
                        return;
                    }

                    // Basic validation to check headers
                    const firstRow = rows[0];
                    // Validar colunas essenciais dependendo do mapeamento pré-acordado.
                    if (!("codigo do pedido" in firstRow || "Pedido" in firstRow || "pedido" in firstRow)) {
                        toast.warning("Atenção com as colunas", {
                            description: "A coluna 'codigo do pedido' não foi encontrada, os dados podem estar incompletos."
                        });
                    }

                    console.log("Parsed CSV:", rows);

                    // Aqui mapeamos as colunas do seu CSV para as colunas do banco (Directus)
                    const lotToInsert = rows.map((row) => ({
                        pedido: row['codigo do pedido'] || row['Pedido'] || row['pedido'] || '',
                        origin: row['Nome original'] || row['Origem'] || row['origin'] || '',
                        destination: row['nome do destino'] || row['Destino'] || row['destination'] || '',
                        uf: row['UF'] || row['uf'] || '',
                        client_name: row['Cliente'] || row['cliente'] || row['client_name'] || '',
                        status: 'new', // status padrão
                        nome_tp: row['razao social'] || row['TP'] || row['nome_tp'] || row['Transportadora'] || '',
                        cargo_type: row['tipo de material'] || row['Produto'] || row['cargo_type'] || '',
                        // Adicione outros campos se necessário (ex.: data_pedido, carga_extra)
                    }));

                    // Chamada para a mutation inserindo tudo de uma vez
                    if (createEmbarquesBatch) {
                        await createEmbarquesBatch(lotToInsert);
                        toast.success("Importação concluída", {
                            description: `${rows.length} embarques importados com sucesso.`
                        });
                        closeDialog();
                    } else {
                        // Fallback/Simulated timeout
                        setTimeout(() => {
                            toast.success("Processamento simulado", { description: `${rows.length} linhas lidas.` });
                            closeDialog();
                        }, 1000);
                    }
                } catch (error) {
                    console.error("Erro na importação: ", error);
                    toast.error("Erro na importação", {
                        description: "Não foi possível salvar os registros. Tente novamente."
                    });
                } finally {
                    setIsProcessing(false);
                }
            },
            error: (error) => {
                console.error("Papa Parse Error:", error);
                toast.error("Falha ao ler o arquivo", {
                    description: error.message
                });
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
                    <DialogTitle>Importar Embarques</DialogTitle>
                    <DialogDescription>
                        Faça upload de um arquivo CSV para carregar múltiplos embarques de uma vez.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-4">
                    {!selectedFile ? (
                        <div
                            className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center space-y-4 cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                                }`}
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
                                <p className="text-xs text-muted-foreground mt-1">
                                    Somente arquivos .csv (máximo 5MB)
                                </p>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv, text/csv"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                            <div className="flex items-center space-x-3 overflow-hidden">
                                <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                                    <FileSpreadsheet className="h-5 w-5" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedFile(null)}
                                disabled={isProcessing}
                                className="shrink-0 ml-2"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={closeDialog} disabled={isProcessing}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={processFile}
                        disabled={!selectedFile || isProcessing}
                        className="w-full sm:w-auto"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            "Importar Dados"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
