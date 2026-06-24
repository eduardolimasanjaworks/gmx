import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileSpreadsheet, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useFollow } from "@/hooks/useFollow";
import { useTiposOperacao } from "@/hooks/useTiposOperacao";
import { useConfigRotas } from "@/hooks/useConfigRotas";
import { parseCsvRows, csvRowsToFollowPayload } from "@/lib/csvFollowParser";
import { criarEmbarquesDoCsv } from "@/lib/embarque-rota-service";
import { CsvColumnMapper } from "@/components/dashboard/CsvColumnMapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    inferirCsvColumnMapping,
    mapCsvRowsToEmbarques,
    mappingObrigatorioValido,
    type CsvColumnMapping,
    type EmbarqueCsvCampo,
} from "@/lib/csvEmbarqueMapping";

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
    const [isParsing, setIsParsing] = useState(false);
    const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<CsvColumnMapping | null>(null);
    const [defaultOperacao, setDefaultOperacao] = useState<string>("");
    const [defaultRotaId, setDefaultRotaId] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { importFollow } = useFollow();
    const { tipos = [] } = useTiposOperacao();
    const { rotas = [] } = useConfigRotas();
    const queryClient = useQueryClient();

    const isEmbarques = mode === "embarques";
    const operacoes = tipos
        .filter((t: any) => t?.ativo !== false)
        .map((t: any) => String(t?.nome || '').trim())
        .filter(Boolean);
    const rotasOperacao = rotas
        .filter((r: any) => r?.ativo !== false)
        .filter((r: any) => !defaultOperacao || String(r?.operacao || '').toUpperCase() === defaultOperacao.toUpperCase());

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

    const resetParsedState = () => {
        setParsedRows([]);
        setHeaders([]);
        setMapping(null);
        setIsParsing(false);
        setDefaultOperacao("");
        setDefaultRotaId("");
    };

    const parseFileRows = (file: File): Promise<Record<string, unknown>[]> =>
        new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(),
                complete: (results) => resolve(results.data as Record<string, unknown>[]),
                error: reject,
            });
        });

    const handleFileSelection = async (file: File) => {
        if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
            toast.error("Formato inválido", {
                description: "Por favor, selecione um arquivo formato CSV."
            });
            return;
        }
        resetParsedState();
        setSelectedFile(file);
        if (!isEmbarques) return;
        setIsParsing(true);
        try {
            const rows = await parseFileRows(file);
            if (rows.length === 0) {
                toast.error("Arquivo vazio", {
                    description: "O arquivo CSV não contém dados válidos."
                });
                setSelectedFile(null);
                resetParsedState();
                return;
            }
            const firstRow = rows[0] || {};
            const parsedHeaders = Object.keys(firstRow);
            setParsedRows(rows);
            setHeaders(parsedHeaders);
            setMapping(inferirCsvColumnMapping(parsedHeaders));
        } catch (error: any) {
            toast.error("Falha ao ler o arquivo", {
                description: error?.message || "Nao foi possivel analisar o CSV."
            });
            setSelectedFile(null);
            resetParsedState();
        } finally {
            setIsParsing(false);
        }
    };

    const processFile = async () => {
        if (!selectedFile) return;
        if (isEmbarques && (!mapping || !mappingObrigatorioValido(mapping))) {
            toast.error("Mapeamento incompleto", {
                description: "Origem e destino precisam estar mapeados antes da importacao."
            });
            return;
        }
        setIsProcessing(true);
        try {
            const rows = isEmbarques && parsedRows.length > 0 ? parsedRows : await parseFileRows(selectedFile);
            if (rows.length === 0) {
                toast.error("Arquivo vazio", {
                    description: "O arquivo CSV nao contem dados validos."
                });
                return;
            }

            if (isEmbarques) {
                const mappedRows = mapCsvRowsToEmbarques(rows, mapping!);
                const op = defaultOperacao.trim() || undefined;
                const rotaIdManual = defaultRotaId ? Number(defaultRotaId) : undefined;
                const enrichedRows = mappedRows.map((row) => ({
                    ...row,
                    operacao: row.operacao?.trim() ? row.operacao : op,
                }));
                const stats = await criarEmbarquesDoCsv(enrichedRows, {
                    usuario: "portal",
                    defaultOperacao: op,
                    rotaIdManual,
                });
                await queryClient.invalidateQueries({ queryKey: ["embarques"] });
                toast.success("Embarques importados!", {
                    description: `${stats.total} linhas — ${stats.correlacionados} com rota, ${stats.pendentes} pendentes de correlacao.`,
                });
            } else {
                const parsed = parseCsvRows(rows);
                const lotToInsert = csvRowsToFollowPayload(parsed);
                await importFollow(lotToInsert as any);
                toast.success("Importacao concluida!", {
                    description: `${rows.length} registros importados com sucesso.`
                });
            }
            closeDialog();
        } catch (error: unknown) {
            console.error("Erro na importacao:", error);
            const err = error as { errors?: { message?: string }[]; message?: string };
            toast.error("Erro ao importar", {
                description: err?.errors?.[0]?.message || err?.message || "Nao foi possivel salvar. Veja o console."
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const closeDialog = () => {
        setSelectedFile(null);
        setIsProcessing(false);
        resetParsedState();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={closeDialog}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEmbarques ? "Importar Embarques (CSV)" : "Importar Follow (CSV)"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEmbarques
                            ? "Selecione qualquer CSV e mapeie manualmente as colunas para os campos do embarque antes de importar."
                            : "Colunas esperadas: Pedido, Origem, Destino, UF, Cliente, TP, Produto."}
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
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                                        <FileSpreadsheet className="h-5 w-5" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                            {isEmbarques && headers.length > 0 ? ` • ${parsedRows.length} linhas` : ""}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} disabled={isProcessing || isParsing} className="shrink-0 ml-2">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {isEmbarques && isParsing && (
                                <div className="rounded-md border px-3 py-4 text-sm text-muted-foreground flex items-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Lendo colunas do CSV...
                                </div>
                            )}

                            {isEmbarques && !isParsing && headers.length > 0 && mapping && (
                                <CsvColumnMapper
                                    headers={headers}
                                    previewRows={parsedRows.slice(0, 3)}
                                    mapping={mapping}
                                    onChange={(campo: EmbarqueCsvCampo, coluna: string) =>
                                        setMapping((atual) => ({ ...(atual || inferirCsvColumnMapping(headers)), [campo]: coluna }))
                                    }
                                />
                            )}

                            {isEmbarques && !isParsing && headers.length > 0 && mapping && (
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-1.5 rounded-md border p-3">
                                        <div className="text-sm font-medium">Operacao (fallback)</div>
                                        <div className="text-xs text-muted-foreground">
                                            Usada apenas quando a linha nao trouxer operacao (ou quando o campo nao estiver mapeado).
                                        </div>
                                        <Select value={defaultOperacao} onValueChange={setDefaultOperacao}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Nao definir" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Nao definir</SelectItem>
                                                {operacoes.map((op: string) => (
                                                    <SelectItem key={op} value={op}>
                                                        {op}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5 rounded-md border p-3">
                                        <div className="text-sm font-medium">Rota (fallback)</div>
                                        <div className="text-xs text-muted-foreground">
                                            Se selecionada, força esta rota para todos os embarques importados neste arquivo.
                                        </div>
                                        <Select value={defaultRotaId} onValueChange={setDefaultRotaId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Automatica pela origem/destino" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Automatica pela origem/destino</SelectItem>
                                                {rotasOperacao.map((r: any) => (
                                                    <SelectItem key={String(r.id)} value={String(r.id)}>
                                                        {String(r.origem || '').trim()} → {String(r.destino || '').trim()}
                                                        {r.operacao ? ` (${String(r.operacao).trim()})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={closeDialog} disabled={isProcessing}>Cancelar</Button>
                    <Button
                        onClick={() => void processFile()}
                        disabled={!selectedFile || isProcessing || isParsing || (isEmbarques && (!mapping || !mappingObrigatorioValido(mapping)))}
                        className="w-full sm:w-auto"
                    >
                        {isProcessing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</>
                        ) : isEmbarques ? "Importar embarques" : "Importar dados"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
