import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileSpreadsheet, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useFollow } from "@/hooks/useFollow";

interface CsvImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { importFollow } = useFollow();

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
            // Excel CSV pode ter BOM (\uFEFF) no início - remover automaticamente
            transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
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

                    console.log("Parsed CSV rows:", rows);
                    console.log("CSV Headers detected:", Object.keys(rows[0] || {}));

                    // Normaliza chave: remove BOM + minúscula + remove acentos
                    const norm = (s: string) => s
                        .replace(/^\uFEFF/, '')  // remove BOM do Excel
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .trim();

                    // Debug: mostra os headers normalizados
                    const allKeys = Object.keys(rows[0] || {});
                    console.log('Headers RAW:', allKeys);
                    console.log('Headers normalizados:', allKeys.map(norm));

                    // Busca valor da row pela chave normalizada
                    const get = (row: any, ...keys: string[]) => {
                        const normalized = Object.fromEntries(
                            Object.entries(row).map(([k, v]) => [norm(k), v])
                        );
                        for (const key of keys) {
                            const val = normalized[norm(key)];
                            if (val !== undefined && val !== '') return String(val);
                        }
                        return '';
                    };

                    // Mapeamento: Coluna CSV -> Campo da collection 'follow'
                    // Headers reais: "codigo de pedido", "nome original", "nome do destino",
                    //                "razão social", "numero de paletes"
                    const lotToInsert = rows.map((row) => {
                        let ped = get(row, 'Código de pedido de insumos', 'código de pedido de insumos', 'codigo de pedido de insumos');
                        return {
                            status: 'novo',
                            pedido: ped || '-',
                            origem: get(row, 'nome original', 'Nome original', 'Origem', 'origem'),
                            destino: get(row, 'nome do destino', 'Destino', 'destino'),
                            uf: get(row, 'UF', 'uf'),
                            cliente: get(row, 'Cliente', 'cliente', 'nome do cliente'),
                            tp: get(row, 'razao social', 'razão social', 'TP', 'tp', 'Transportadora'),
                            produto: get(row, 'tipo de material', 'Produto', 'produto'),
                            paletes: get(row, 'numero de paletes', 'número de paletes', 'numero de palets', 'paletes', 'Paletes'),
                        };
                    });

                    console.log("Payload to insert:", lotToInsert);

                    await importFollow(lotToInsert);

                    toast.success("Importação concluída!", {
                        description: `${rows.length} registros importados com sucesso.`
                    });
                    closeDialog();
                } catch (error: any) {
                    console.error("Erro na importação:", error);
                    toast.error("Erro ao importar", {
                        description: error?.errors?.[0]?.message || error?.message || "Não foi possível salvar. Veja o console."
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
                    <DialogTitle>Importar Follow (CSV)</DialogTitle>
                    <DialogDescription>
                        Colunas esperadas: <strong>Pedido, Origem, Destino, UF, Cliente, TP, Produto</strong>
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
