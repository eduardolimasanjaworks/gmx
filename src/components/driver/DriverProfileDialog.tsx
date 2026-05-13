
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Pencil, User, FileText, Truck, ScrollText, X, AlertCircle, Save, Loader2, ScanText, ImageIcon, File as FileIcon, Plus, MapPin, Search, CloudUpload, RefreshCw } from "lucide-react";
import { directus, directusUrl } from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parse, isAfter, isBefore, startOfDay, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { createWorker } from 'tesseract.js';
import { uploadToDirectus } from "@/lib/directusUpload";
import { useAuth } from "@/context/AuthContext";

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Token de Admin para operações privilegiadas (bypass de permissões)
const ADMIN_TOKEN = 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';

const STATUS_OPTIONS = [
  { value: 'BLOQUEADO', label: 'BLOQUEADO', color: 'bg-red-600 hover:bg-red-600' },
  { value: 'CADASTRADO', label: 'CADASTRADO', color: 'bg-green-600 hover:bg-green-600' },
  { value: 'FALTA DOCS', label: 'FALTA DOCS', color: 'bg-yellow-500 hover:bg-yellow-500 text-black' },
  { value: 'NECESSARIO ATUALIZAR', label: 'NECESSARIO ATUALIZAR', color: 'bg-orange-500 hover:bg-orange-500 text-black' },
  { value: 'REPROVADO', label: 'REPROVADO', color: 'bg-red-700 hover:bg-red-700' },
  { value: 'INATIVO', label: 'INATIVO', color: 'bg-gray-500 hover:bg-gray-500' },
  { value: '_empty_', label: '(vazio)', color: 'bg-gray-300 text-black hover:bg-gray-300' }
];

const getStatusBadgeColor = (status: string) => {
  if (!status || status === '_empty_') return STATUS_OPTIONS.find(x => x.value === '_empty_')?.color;
  const s = STATUS_OPTIONS.find(x => x.value === status.toUpperCase() || x.label === status.toUpperCase());
  return s ? s.color : 'bg-secondary text-secondary-foreground';
};

const parseDateBR = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null;
  const str = dateStr.trim();
  
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.split('T')[0].split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  
  try {
     const parsed = parse(str, 'dd/MM/yyyy', new Date());
     return isNaN(parsed.getTime()) ? null : parsed;
  } catch (e) {
     return null;
  }
};

const formatDateForAPI = (dateStr: any) => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const d = parseDateBR(dateStr);
  if (d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return dateStr;
};

const getCnhStatus = (dateStr: string) => {
  const d = parseDateBR(dateStr);
  if (!d) return null;
  const today = startOfDay(new Date());
  if (isBefore(d, today)) return 'Expirado';
  return 'No Prazo';
};

const getAuthenticatedUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.includes('googleapis.com') || url.includes('base64')) return url;
  if (url.includes(directusUrl) && !url.includes('access_token')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}access_token=${ADMIN_TOKEN}`;
  }
  return url;
};

interface DriverProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string | null;
  driverData?: any;
  initialEditMode?: boolean;
  onUpdate?: (newDriver?: any) => void;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  try {
    const d = parseDateBR(dateStr);
    if (d) return format(d, "dd/MM/yyyy", { locale: ptBR });
    return String(dateStr);
  } catch (e) {
    return String(dateStr);
  }
};

const FieldRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 h-9">
    <span className="text-sm text-muted-foreground">{label}:</span>
    <span className={`font-medium text-sm text-right truncate max-w-[200px] ${!value ? 'text-muted-foreground/40' : ''}`}>
      {value || "-"}
    </span>
  </div>
);

const InputField = ({ label, value, onChange, type = "text", numeric = false, isDate = false }: any) => {
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newVal = e.target.value;
    
    if (isDate) {
      // Remove all non-digits
      let v = newVal.replace(/\D/g, '');
      if (v.length > 8) v = v.substring(0, 8);
      
      // Apply DD/MM/YYYY mask
      if (v.length > 4) {
        v = v.replace(/^(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
      } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d+)/, '$1/$2');
      }
      
      onChange(v);
      return;
    }

    if (numeric) {
      if (newVal === "") {
        onChange("");
        setError("");
        return;
      }
      if (/^\d+$/.test(newVal)) {
        onChange(newVal);
        setError("");
      } else {
        setError("Apenas números são permitidos");
      }
    } else {
      onChange(newVal);
    }
  };

  return (
    <div className="flex flex-col space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input
        type={type}
        value={value || ''}
        onChange={handleChange}
        className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
      />
      {error && <span className="text-xs text-red-500 font-medium animate-pulse">{error}</span>}
    </div>
  );
};

// Componente especial para validar CPF contra o CPF do cadastro principal
const CpfInputField = ({ label, value, onChange, referenceCpf }: any) => {
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;

    // Validar apenas números
    if (newVal === "") {
      onChange("");
      setError("");
      setWarning("");
      return;
    }

    setError("");
    onChange(newVal);

    // Validar se é igual ao CPF de referência
    if (referenceCpf && newVal !== referenceCpf) {
      setWarning(`❌ CPF diferente do cadastrado (${referenceCpf})`);
    } else if (referenceCpf && newVal === referenceCpf) {
      setWarning("✅ CPF confirmado");
    } else {
      setWarning("");
    }
  };

  const isValid = referenceCpf && value === referenceCpf;
  const isInvalid = referenceCpf && value && value !== referenceCpf;

  return (
    <div className="flex flex-col space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input
        type="text"
        value={value || ''}
        onChange={handleChange}
        className={`${error || isInvalid
          ? "border-red-500 focus-visible:ring-red-500"
          : isValid
            ? "border-green-500 focus-visible:ring-green-500"
            : ""
          }`}
        placeholder={referenceCpf || "Digite o CPF"}
      />
      {error && <span className="text-xs text-red-500 font-medium animate-pulse">{error}</span>}
      {!error && isInvalid && (
        <span className="text-xs text-red-500 font-medium animate-pulse">
          ❌ CPF deve ser igual ao cadastrado: {referenceCpf}
        </span>
      )}
      {!error && isValid && (
        <span className="text-xs text-green-600 font-medium">
          ✅ CPF confirmado
        </span>
      )}
    </div>
  );
};

export const DriverProfileDialog = ({ open, onOpenChange, driverName, driverData, initialEditMode = false, onUpdate }: DriverProfileDialogProps) => {
  const { refreshToken, logout, token } = useAuth();
  const [data, setData] = useState({
    cnh: null as any,
    antt: null as any,
    crlv: null as any,
    comprovante_endereco: null as any,
    fotos: null as any,
    carretas: [] as any[],
    disponivel: null as any,
  });

  /* Carreta State */
  const [isEditingCarreta, setIsEditingCarreta] = useState(false);
  const [currentCarretaIndex, setCurrentCarretaIndex] = useState<number | null>(null);
  const [carretaForm, setCarretaForm] = useState<any>({});

  const [localDriverData, setLocalDriverData] = useState<any>(driverData);

  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [infoFormData, setInfoFormData] = useState<any>({});

  // Document Edit States
  const [isEditingCNH, setIsEditingCNH] = useState(false);
  const [cnhForm, setCnhForm] = useState<any>({});

  const [isEditingCRLV, setIsEditingCRLV] = useState(false);
  const [crlvForm, setCrlvForm] = useState<any>({});

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<any>({});

  const [isEditingANTT, setIsEditingANTT] = useState(false);
  const [anttForm, setAnttForm] = useState<any>({});

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [filesServiceAvailable, setFilesServiceAvailable] = useState(true);
  const [isDrivePopupOpen, setIsDrivePopupOpen] = useState(false);
  const [driveFolderName, setDriveFolderName] = useState('');

  const handleUploadToDrive = async () => {
    setIsUploadingToDrive(true);
    try {
      const photos = [
        { key: 'foto_cavalo', label: 'Cavalo', url: getAuthenticatedUrl(data.fotos?.foto_cavalo) },
        { key: 'foto_lateral', label: 'Lateral', url: getAuthenticatedUrl(data.fotos?.foto_lateral) },
        { key: 'foto_traseira', label: 'Traseira', url: getAuthenticatedUrl(data.fotos?.foto_traseira) }
      ];

      const validPhotos = photos.filter(p => p.url);
      if (validPhotos.length === 0) {
        toast({ variant: 'destructive', title: 'Nenhuma foto anexada', description: 'Não há fotos para enviar ao Drive.' });
        return;
      }

      const driverName = localDriverData?.nome || driverData?.nome || 'Desconhecido';
      const placa = data.crlv?.placa_cavalo || 'SemPlaca';

      toast({ title: 'Criando pasta...', description: 'Aguarde enquanto a pasta é criada no Drive.' });
      const createFolderRes = await fetch('http://localhost:8099/create-drive-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: driveFolderName || driverName })
      });
      if (!createFolderRes.ok) {
        const errJson = await createFolderRes.json();
        throw new Error(errJson.error || 'Falha ao criar pasta no Drive');
      }
      const createFolderData = await createFolderRes.json();
      const newFolderId = createFolderData.folderId;

      toast({ title: 'Pasta criada', description: `Enviando ${validPhotos.length} fotos...` });

      for (const photo of validPhotos) {
        if (!photo.url) continue;
        // Traz o Blob localmente
        const res = await fetch(photo.url);
        if (!res.ok) throw new Error(`Falha ao baixar a imagem: ${photo.label}`);
        const blob = await res.blob();

        const formData = new FormData();
        const cleanName = driverName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${placa}_${cleanName}_${photo.label}.jpg`.replace(/[^a-zA-Z0-9_.-]/g, '_');
        
        formData.append('file', blob, fileName);
        formData.append('fileName', fileName);
        formData.append('folderId', newFolderId);

        const uploadRes = await fetch('http://localhost:8099/upload-to-drive', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || `Falha no upload de ${photo.label}`);
        }
      }
      toast({ title: 'Sucesso', description: 'Fotos enviadas para a pasta no Google Drive com sucesso!' });
      setIsDrivePopupOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao Enviar ao Drive', description: err.message || 'Erro desconhecido' });
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const [activeTab, setActiveTab] = useState<string>("geral");
  const { toast } = useToast();

  const tabStorageKey = localDriverData?.id ? `driver-profile-tab:${localDriverData.id}` : null;

  const parseNumberOrUndefined = (val: unknown) => {
    if (val === null || val === undefined) return undefined;
    const str = String(val).trim();
    if (!str) return undefined;
    const num = Number(str.replace(",", "."));
    return Number.isFinite(num) ? num : undefined;
  };

  const performOCR = async (file: File) => {
    setOcrLoading(true);
    try {
      let objectUrl: string;
      let img = new Image();
      let scale = 3;

      if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          let fullNativeText = "";
          const pages = [];
          let totalHeight = 0;
          let maxWidth = 0;
          const viewports = [];

          // 1. Coleta todas as páginas e extrai o texto nativo
          for (let i = 1; i <= pdf.numPages; i++) {
             const page = await pdf.getPage(i);
             pages.push(page);
             
             const textContent = await page.getTextContent();
             let pageText = "";
             let lastY = -1;
             for (const item of textContent.items as any[]) {
               if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
                 pageText += "\n";
               } else if (lastY !== -1 && item.str.trim() !== "") {
                 pageText += " ";
               }
               pageText += item.str;
               lastY = item.transform[5];
             }
             fullNativeText += pageText + "\n";
             
             const vp = page.getViewport({ scale: 4.0 });
             viewports.push(vp);
             totalHeight += vp.height;
             if (vp.width > maxWidth) maxWidth = vp.width;
          }

          // Verifica se o texto nativo realmente parece uma CNH (tem CPF e Datas) ou se é só lixo de QR Code
          const hasCPF = fullNativeText.replace(/[^\d]/g, '').match(/\d{11}/);
          const hasDate = fullNativeText.match(/\b\d{1,2}\s*[\/.-]\s*\d{1,2}\s*[\/.-]\s*\d{4}\b/);
          
          const isValidNativeCNH = fullNativeText.trim().length > 100 && hasCPF && hasDate;

          // 2. Costuramos todas as páginas verticalmente
          const pdfCanvas = document.createElement("canvas");
          const pdfCtx = pdfCanvas.getContext("2d");
          if (!pdfCtx) throw new Error("Canvas 2D context not available");

          pdfCanvas.width = maxWidth;
          pdfCanvas.height = totalHeight;
          pdfCtx.fillStyle = "white";
          pdfCtx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);

          let currentY = 0;
          for (let i = 0; i < pages.length; i++) {
             const vp = viewports[i];
             const pageCanvas = document.createElement("canvas");
             pageCanvas.width = vp.width;
             pageCanvas.height = vp.height;
             const pageCtx = pageCanvas.getContext("2d");
             if (pageCtx) {
               pageCtx.fillStyle = "white";
               pageCtx.fillRect(0, 0, vp.width, vp.height);
               await pages[i].render({ canvasContext: pageCtx, viewport: vp }).promise;
               pdfCtx.drawImage(pageCanvas, 0, currentY);
             }
             currentY += vp.height;
          }

          // Processamento visual concluído
          // Removido o atalho que deduzia que o arquivo estava bom apenas por ter algum texto nativo.
          // Agora vamos sempre gerar a imagem e rodar o Tesseract em todo o PDF para garantir que nada passe despercebido.
          
          // Então enviaremos a imagem completa (frente e verso) para o Tesseract ler as imagens
          objectUrl = pdfCanvas.toDataURL("image/png");
          scale = 1; // Já foi escalado no viewport do PDF
          
          // E salvaremos o native text para concatenar caso tenha algo útil
          (file as any)._extractedNativeText = fullNativeText;
        } catch (pdfErr: any) {
          console.error("Erro ao processar PDF:", pdfErr);
          throw new Error("Erro no PDF: " + (pdfErr.message || String(pdfErr)));
        }
      } else {
        objectUrl = URL.createObjectURL(file);
      }

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context not available");

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Filtros básicos: Escala de cinza e um leve aumento de contraste
      // Deixamos a binarização pesada para o próprio Tesseract (que usa Otsu e lida melhor com bordas suaves)
      ctx.filter = 'grayscale(1) contrast(1.2)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      if (file.type !== 'application/pdf') {
        URL.revokeObjectURL(objectUrl);
      }

      // Usar a imagem processada
      const processedImageUrl = canvas.toDataURL("image/png");

      const worker = await createWorker('por');
      const ret = await worker.recognize(processedImageUrl);
      await worker.terminate();
      let retText = ret.data.text;
      if ((file as any)._extractedNativeText) {
         retText += "\n\n" + (file as any)._extractedNativeText;
      }
      return retText;
    } catch (error: any) {
      console.error("OCR/PDF Error:", error);
      throw new Error(error.message || "Falha ao processar arquivo");
    } finally {
      setOcrLoading(false);
    }
  };

  const parseCnhOcrData = (text: string, currentForm: any) => {
    const updates: any = {};
    
    // Corrige erros bizarros de OCR em números (ex: o723180194o -> 07231801940)
    // Cuidado para não destruir palavras reais, fazemos isso numa cópia focada em extrair dígitos
    const textNumerico = text.replace(/[oO](?=\d)|(?<=\d)[oO]/g, '0');
    const norm = textNumerico.replace(/\s+/g, ' ').toUpperCase();
    const cleanNumbers = text.replace(/[^\d]/g, ''); // Apenas números para buscas exatas de CPF e Renach
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);

    // ── DATAS: Estratégia Cronológica Universal para CNH ───────────
    // Aceita datas com ou sem espaços entre as barras
    const dateRegex = /\b(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{4})\b/g;
    const allDates: Array<{str: string, ts: number}> = [];
    let match;
    
    // Buscar no texto original e no texto sem espaços extras nas datas
    const textForDates = textNumerico.replace(/(\d)\s+([\/.])\s+(\d)/g, '$1$2$3');
    while ((match = dateRegex.exec(textForDates)) !== null) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      const ts = new Date(y, m - 1, d).getTime();
      if (ts > new Date(1940, 0, 1).getTime() && ts < new Date(2100, 0, 1).getTime()) {
        const formatted = `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
        allDates.push({ str: formatted, ts });
      }
    }

    const uniqueDates = Array.from(new Map(allDates.map(item => [item.ts, item])).values());
    uniqueDates.sort((a, b) => a.ts - b.ts);

    const now = Date.now();
    const past = uniqueDates.filter(d => d.ts <= now);
    const future = uniqueDates.filter(d => d.ts > now);

    if (!currentForm.validade && future.length > 0) updates.validade = future[future.length - 1].str;

    if (past.length >= 3) {
      if (!currentForm.data_nasc) updates.data_nasc = past[0].str;
      if (!currentForm.primeira_habilitacao) updates.primeira_habilitacao = past[1].str;
      if (!currentForm.emissao_cnh) updates.emissao_cnh = past[past.length - 1].str;
    } else if (past.length === 2) {
      if (!currentForm.data_nasc) updates.data_nasc = past[0].str;
      if (!currentForm.emissao_cnh) updates.emissao_cnh = past[1].str;
    } else if (past.length === 1) {
      if (!currentForm.emissao_cnh) updates.emissao_cnh = past[0].str;
    }

    // ── CPF ────────────────────────────────────────────────────────
    if (!currentForm.cpf) {
      // Procura primeiro com formatação, senão busca qualquer sequência de 11 dígitos que comece no documento
      const cpfMatch = norm.match(/\d{3}\s*[\.\s]?\s*\d{3}\s*[\.\s]?\s*\d{3}\s*[-\s]?\s*\d{2}/);
      if (cpfMatch) {
        updates.cpf = cpfMatch[0].replace(/[^\d]/g, '');
      } else {
         const possibleCpfs = cleanNumbers.match(/\d{11}/g) || [];
         // Muitas vezes o CPF é o primeiro ou segundo número de 11 dígitos da CNH
         if (possibleCpfs.length > 0) updates.cpf = possibleCpfs[0];
      }
    }

    // ── CATEGORIA ──────────────────────────────────────────────────
    if (!currentForm.categoria) {
      // Prioriza categorias de 2 letras
      const CAT_REGEX_2 = /\b(AB|AC|AD|AE)\b/g;
      const CAT_REGEX_1 = /\b(A|B|C|D|E)\b/g;
      
      // Estratégia 1: busca próximo ao rótulo
      const catContextMatch = norm.match(/(?:CAT\.?\s*HAB|HABILITA[CÇ][AÃ]O|CATEGORIA|CAT)[^\n]{0,40}?\b(AB|AC|AD|AE|A|B|C|D|E)\b/);
      if (catContextMatch) {
        updates.categoria = catContextMatch[1];
      } else {
        // Estratégia 2: Se não achou com rótulo, procura qualquer categoria dupla válida
        const match2 = norm.match(CAT_REGEX_2);
        if (match2) {
          updates.categoria = match2[0];
        } else {
          // Estratégia 3: Fallback para categoria simples, filtrando preposições e lixo do cabeçalho
          const IGNORE_WORDS = new Set(['DE', 'DA', 'DO', 'AS', 'OS', 'SE', 'EM', 'AO', 'A', 'E', 'O']);
          const headerCleaned = norm.replace(/DRIVER LICENSE|PERMISO DE CONDUCCION|CARTEIRA NACIONAL|REPUBLICA|FEDERATIVA|MINISTERIO|TRANSITO/g, '');
          const match1 = headerCleaned.match(CAT_REGEX_1);
          if (match1) {
            // Pega a primeira letra solta que não seja uma palavra comum ignorada
            const cat = match1.find(c => !IGNORE_WORDS.has(c) || c === 'A' || c === 'B' || c === 'C' || c === 'D' || c === 'E');
            if (cat) updates.categoria = cat;
          }
        }
      }
    }

    // ── Nº REGISTRO CNH (11 dígitos) ───────────────────────────────
    if (!currentForm.n_registro_cnh) {
      const cpfDigits = updates.cpf || currentForm.cpf || '';
      const regMatches = cleanNumbers.match(/\d{11}/g) || [];
      const registro = regMatches.find(n => n !== cpfDigits);
      if (registro) updates.n_registro_cnh = registro;
    }

    // ── Nº FORMULÁRIO / ESPELHO (9 a 12 dígitos) ───────────────────
    if (!currentForm.n_formulario_cnh) {
      const formMatches = cleanNumbers.match(/\d{9,12}/g) || [];
      const cpfDigits = updates.cpf || currentForm.cpf || '';
      const regDigits = updates.n_registro_cnh || currentForm.n_registro_cnh || '';
      // Encontra um número que não seja nem CPF nem Registro
      const formulario = formMatches.find(n => n !== cpfDigits && n !== regDigits && !n.startsWith('0000'));
      if (formulario) updates.n_formulario_cnh = formulario;
    }

    // ── RENACH (UF + 9 dígitos) ────────────────────────────────────
    if (!currentForm.n_cnh_renach) {
      const renachRaw = norm.replace(/\s+/g, ''); // Remove espaços para grudar o UF no número
      const renachMatch = renachRaw.match(/([A-Z]{2})([0-9OISBZ]{9})/);
      if (renachMatch) {
        const uf = renachMatch[1];
        // Corrige confusões comuns do Tesseract em números do RENACH
        const num = renachMatch[2].replace(/[O]/g, '0').replace(/[I]/g, '1').replace(/[S]/g, '5').replace(/[B]/g, '8').replace(/[Z]/g, '2');
        updates.n_cnh_renach = uf + num;
      }
    }

    // ── NOME DA MÃE (Busca por Filiação) ───────────────────────────
    if (!currentForm.nome_mae) {
      // Procura a linha que contem filiação (mesmo mal escrita pelo OCR como "FIAÇÃO")
      const filiacaoIdx = lines.findIndex((l: string) => /FILIA[CÇ][AÃ]O|FIA[CÇ][AÃ]O|M[AÃ]E/i.test(l));
      if (filiacaoIdx !== -1) {
        // As próximas 2 linhas válidas sem números provavelmente são os pais
        const parentLines = lines.slice(filiacaoIdx + 1, filiacaoIdx + 5)
          .map(l => l.replace(/[^a-zA-ZÀ-ú\s]/g, '').trim())
          .filter(l => l.length > 5)
          .map(l => l.replace(/^(?:[a-zA-Z]{1,2}\s+)+/, '').trim()); // Remove sujeiras como "E o ", "A "
        
        // Em CNH, o primeiro nome é o pai, o segundo é a mãe. Se só tiver 1, é a mãe.
        if (parentLines.length >= 2) {
          updates.nome_mae = parentLines[1];
        } else if (parentLines.length === 1) {
          updates.nome_mae = parentLines[0];
        }
      }
    }

    return {
      ...currentForm,
      ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== null && v !== '')),
      observacao: currentForm.observacao
        ? currentForm.observacao + '\n\n[OCR]: ' + text
        : '[OCR]: ' + text,
    };
  };

  const uploadPublicAndGetUrl = async (file: File, key: string) => {
    // Upload direto para o Directus Files com retry de auth e fallback para admin
    if (!localDriverData?.id) throw new Error("Motorista não carregado");

    try {
      return await uploadToDirectus(file, undefined, token || undefined);
    } catch (error: any) {
      const msg = error.message || '';
      // Se der erro de permissão (403) ou token inválido, tenta com o ADMIN_TOKEN
      if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('permission')) {
        console.warn("Sem permissão com usuário atual. Usando Token de Serviço...");
        return await uploadToDirectus(file, undefined, ADMIN_TOKEN);
      }
      // Se o token expirou, tenta refresh
      if (error.message?.includes('Token expired') || error.message?.includes('401') || (error.errors && error.errors[0]?.message === 'Token expired.')) {
        try {
          console.log("Token expirado no upload, tentando refresh...");
          const newToken = await refreshToken();
          console.log("Token renovado, tentando upload novamente...");
          return await uploadToDirectus(file, undefined, newToken);
        } catch (refreshError) {
          console.error("Refresh falhou durante upload", refreshError);
          logout();
          throw new Error("Sessão expirada. Por favor, faça login novamente.");
        }
      }
      throw error;
    }
  };

  const AttachmentEditor = ({ label = "Anexo", value, onChange, uploadingId, onOcrResult }: any) => {
    const isUploading = uploadingKey === uploadingId;
    return (
      <div className="col-span-2 border rounded-md p-3 bg-muted/10">
        <div className="text-sm font-medium mb-2">{label}</div>
        <div className="grid gap-3">
          <div className="flex flex-col space-y-1.5">
            <span className="text-sm text-muted-foreground">Upload Arquivo</span>
            <Input type="file" accept="image/*,application/pdf" disabled={isUploading || !filesServiceAvailable} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setUploadingKey(uploadingId);
                const url = await uploadPublicAndGetUrl(file, uploadingId);
                onChange(url);
                toast({ title: "Upload concluído" });

                // OCR Logic
                if ((file.type.startsWith('image/') || file.type === 'application/pdf') && onOcrResult) {
                  toast({ title: "Processando Leitura..." });
                  const text = await performOCR(file);
                  onOcrResult(text);
                  toast({ title: "Leitura Concluída", description: "Texto extraído para observação." });
                }

              } catch (err) {
                toast({ variant: "destructive", title: "Erro", description: String(err) });
              } finally {
                setUploadingKey(null);
                e.target.value = "";
              }
            }} />
            {isUploading && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Enviando...</span>}
            {ocrLoading && uploadingKey === uploadingId && <span className="text-xs text-muted-foreground flex items-center gap-1"><ScanText className="h-3 w-3 animate-pulse" /> Lendo imagem...</span>}
          </div>
        </div>
      </div>
    );
  };

  const AttachmentPreview = ({ label = "Anexo", value }: { label?: string; value?: string }) => (
    <div className="col-span-2 border rounded-md p-2 bg-muted/5 flex items-center justify-between mt-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value ? (
        <Button variant="link" className="h-auto p-0 text-blue-600" onClick={() => setDocumentUrl(getAuthenticatedUrl(value))}>
          Visualizar Documento
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Pendente
        </span>
      )}
    </div>
  );

  useEffect(() => { setLocalDriverData(driverData); }, [driverData]);
  useEffect(() => {
    if (open) {
      if (driverData?.id) {
        setLocalDriverData(driverData);
        if (initialEditMode) handleEditInfo(driverData);
        fetchRelatedData();
      } else {
        setLocalDriverData(null);
        setEditFormData({});
        setData({ cnh: null, antt: null, crlv: null, comprovante_endereco: null, fotos: null, carretas: [], disponivel: null });
        setInfoFormData({});
        
        // --- BUFFERS CLEANUP ---
        // Reset all edit mode flags immediately when opening a new driver or closing the dialog
        setIsEditingInfo(false);
        setIsEditingAvailability(false);
        setIsEditingCarreta(false);
        setIsEditingCNH(false);
        setIsEditingCRLV(false);
        setIsEditingANTT(false);
        setIsEditingAddress(false);
        setLoading(false);
        
        if (driverData === undefined) {
          setIsEditingInfo(true);
        }
      }
    } else {
      // Dialog specifically closing - Clean up memory to avoid leaking to next driver
      setLocalDriverData(null);
      setEditFormData({});
      setData({ cnh: null, antt: null, crlv: null, comprovante_endereco: null, fotos: null, carretas: [], disponivel: null });
      setInfoFormData({});
      
      setIsEditingInfo(false);
      setIsEditingAvailability(false);
      setIsEditingCarreta(false);
      setIsEditingCNH(false);
      setIsEditingCRLV(false);
      setIsEditingANTT(false);
      setIsEditingAddress(false);
      setLoading(false);
      setActiveTab("geral");
    }
  }, [open, driverData, initialEditMode]);

  useEffect(() => {
    if (open) {
      try { if (tabStorageKey) { const s = window.localStorage.getItem(tabStorageKey); if (s) setActiveTab(s); } } catch { }
    } else { setActiveTab("geral"); }
  }, [open, tabStorageKey]);

  const handleTabChange = (next: string) => { setActiveTab(next); try { if (tabStorageKey) window.localStorage.setItem(tabStorageKey, next); } catch { } };

  const fetchRelatedData = async () => {
    setLoading(true);
    try {
      const [cnhParams, anttParams, crlvParams, compParams, fotosParams, c1Params, c2Params, c3Params, dispParams] = await Promise.all([
        directus.request(readItems('cnh', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('antt', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('crlv', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('comprovante_endereco', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('fotos', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('carreta_1', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('carreta_2', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('carreta_3', { filter: { motorista_id: { _eq: driverData.id } } })),
        directus.request(readItems('disponivel', { filter: { motorista_id: { _eq: driverData.id } }, sort: ['-date_created'], limit: 1, fields: ['*', 'user_created.*'] })),
      ]);
      setData({
        cnh: cnhParams[0] || null,
        antt: anttParams[0] || null,
        crlv: crlvParams[0] || null,
        comprovante_endereco: compParams[0] || null,
        fotos: fotosParams[0] || null,
        carretas: [
          { type: 'Carreta 1', collection: 'carreta_1', data: c1Params[0] || null },
          { type: 'Carreta 2', collection: 'carreta_2', data: c2Params[0] || null },
          { type: 'Carreta 3', collection: 'carreta_3', data: c3Params[0] || null },
        ],
        disponivel: dispParams[0] || null,
      });
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleEditAvailability = () => {
    const src = data.disponivel || {};
    setEditFormData({
      status: src.status || 'disponivel',
      localizacao_atual: src.localizacao_atual || src.local_disponibilidade || '',
      latitude: src.latitude ?? '',
      longitude: src.longitude ?? '',
      data_previsao_disponibilidade: src.data_previsao_disponibilidade ? new Date(src.data_previsao_disponibilidade).toISOString().split('T')[0] : '',
      observacao: src.observacao || ''
    });
    setIsEditingAvailability(true);
  };

  const handleSaveAvailability = async () => {
    try {
      setLoading(true);
      if (!localDriverData?.id) { toast({ variant: "destructive", title: "Salve o motorista antes." }); return; }

      // Validar se o motorista tem telefone cadastrado (campo obrigatório no Directus)
      if (!localDriverData.telefone) {
        toast({
          variant: "destructive",
          title: "Telefone Obrigatório",
          description: "O motorista precisa ter um telefone cadastrado antes de definir disponibilidade."
        });
        setLoading(false);
        return;
      }

      const payload: any = {
        motorista_id: localDriverData.id,
        telefone: localDriverData.telefone, // Campo obrigatório no schema
        status: editFormData.status || 'published',
        disponivel: editFormData.status === 'disponivel', // Adding the boolean field logic
        localizacao_atual: editFormData.localizacao_atual,
        local_disponibilidade: editFormData.localizacao_atual,
        latitude: parseNumberOrUndefined(editFormData.latitude),
        longitude: parseNumberOrUndefined(editFormData.longitude),
        data_previsao_disponibilidade: editFormData.data_previsao_disponibilidade || null,
        observacao: editFormData.observacao
      };

      if (data.disponivel?.id) {
        await directus.request(updateItem('disponivel', data.disponivel.id, payload));
      } else {
        await directus.request(createItem('disponivel', payload));
      }

      setIsEditingAvailability(false);
      await fetchRelatedData(); // This refreshes data.disponivel with the new ID
      toast({ title: "Disponibilidade atualizada" });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message || String(error) });
    } finally { setLoading(false); }
  };

  const handleGeocodeLocation = async () => {
    if (!editFormData.localizacao_atual) {
      toast({ variant: "destructive", title: "Digite um local", description: "Escreva algo na caixa de Localização primeiro." });
      return;
    }
    
    setIsGeocoding(true);
    try {
      const query = encodeURIComponent(editFormData.localizacao_atual);
      // Limitando as buscas para países da América do Sul (Brasil, Argentina, Uruguai, Paraguai, Chile, Bolívia, Peru, Equador, Venezuela, Colômbia, Guianas)
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br,ar,uy,py,cl,bo,pe,ec,ve,co,gy,sr&q=${query}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          // Nominatim requires an identifiable user agent
          'User-Agent': 'GMX Logistica/1.0' 
        }
      });

      if (!response.ok) throw new Error('Falha na conexão com servidor de mapas.');
      
      const results = await response.json();
      
      if (results && results.length > 0) {
        const { lat, lon, display_name } = results[0];
        setEditFormData((prev: any) => ({
          ...prev,
          latitude: Number(lat).toFixed(6),
          longitude: Number(lon).toFixed(6),
           // Optional: you can update the location string to the canonical name by doing:
           // localizacao_atual: display_name 
        }));
        toast({ title: "Local Econtrado!", description: `Coordenadas capturadas para: ${display_name.split(',')[0]}...` });
      } else {
        toast({ variant: "destructive", title: "Local não encontrado.", description: "Tente escrever de forma mais completa (ex: Cidade, Estado)." });
      }

    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na geolocalização", description: e.message || "Erro desconhecido." });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCancelEdit = () => { setIsEditingAvailability(false); setEditFormData({}); };

  const handleEditInfo = (source?: any) => {
    // Prioridade: parâmetro passado > estado interno localDriverData > prop driverData
    // Isso garante que, mesmo que o useEffect ainda não tenha sincronizado o estado,
    // os campos do formulário sejam preenchidos com os dados existentes do motorista.
    const sourceData = source ?? localDriverData ?? driverData ?? {};
    const defaultVencimentoCx = format(addMonths(new Date(), 5), 'yyyy-MM-dd');
    let derivedStatus = sourceData.status_cadastro || '';
    const cnhStatus = getCnhStatus(data.cnh?.validade);
    if (cnhStatus === 'Expirado' && derivedStatus !== 'BLOQUEADO' && derivedStatus !== 'REPROVADO') {
       derivedStatus = 'NECESSARIO ATUALIZAR';
    }

    setInfoFormData({
      nome: sourceData.nome || '', telefone: sourceData.telefone || '',
      forma_pagamento: sourceData.forma_pagamento || '', cpf: sourceData.cpf || '',
      status_cadastro: derivedStatus,
      vencimento_cx: sourceData.vencimento_cx || defaultVencimentoCx,
      validade_cnh: data.cnh?.validade || '',
      numero_antt: data.antt?.numero_antt || '',
      cep: data.comprovante_endereco?.cep || ''
    });
    setIsEditingInfo(true);
  };
  const handleSaveInfo = async () => {
    const performSave = async () => {
      let resultDriver: any = null;
      if (localDriverData?.id) {
        const updated = await directus.request(updateItem('cadastro_motorista', localDriverData.id, {
          nome: infoFormData.nome, telefone: infoFormData.telefone,
          forma_pagamento: infoFormData.forma_pagamento, cpf: infoFormData.cpf,
          status_cadastro: infoFormData.status_cadastro || null,
          vencimento_cx: formatDateForAPI(infoFormData.vencimento_cx) || null
        }));
        setLocalDriverData(updated); toast({ title: "Atualizado com sucesso" }); resultDriver = updated;

        let relatedChanged = false;
        const telPayload = infoFormData.telefone ? { telefone: infoFormData.telefone } : {};

        if (infoFormData.validade_cnh !== (data.cnh?.validade || '')) {
          const apiValidade = formatDateForAPI(infoFormData.validade_cnh);
          if (data.cnh?.id) { await directus.request(updateItem('cnh', data.cnh.id, { validade: apiValidade, ...telPayload })); }
          else { await directus.request(createItem('cnh', { motorista_id: localDriverData.id, validade: apiValidade, ...telPayload })); }
          relatedChanged = true;
        }
        if (infoFormData.numero_antt !== (data.antt?.numero_antt || '')) {
          if (data.antt?.id) { await directus.request(updateItem('antt', data.antt.id, { numero_antt: infoFormData.numero_antt, ...telPayload })); }
          else { await directus.request(createItem('antt', { motorista_id: localDriverData.id, numero_antt: infoFormData.numero_antt, ...telPayload })); }
          relatedChanged = true;
        }
        if (infoFormData.cep !== (data.comprovante_endereco?.cep || '')) {
          if (data.comprovante_endereco?.id) { await directus.request(updateItem('comprovante_endereco', data.comprovante_endereco.id, { cep: infoFormData.cep, ...telPayload })); }
          else { await directus.request(createItem('comprovante_endereco', { motorista_id: localDriverData.id, cep: infoFormData.cep, ...telPayload })); }
          relatedChanged = true;
        }
        if (relatedChanged) { await fetchRelatedData(); }
      } else {
        const newDriver = await directus.request(createItem('cadastro_motorista', {
          nome: infoFormData.nome, telefone: infoFormData.telefone,
          forma_pagamento: infoFormData.forma_pagamento, cpf: infoFormData.cpf, 
          status_cadastro: infoFormData.status_cadastro || 'draft',
          vencimento_cx: formatDateForAPI(infoFormData.vencimento_cx) || null
        }));
        setLocalDriverData(newDriver); resultDriver = newDriver; toast({ title: "Motorista criado!" });

        let relatedCreated = false;
        const telPayloadNew = infoFormData.telefone ? { telefone: infoFormData.telefone } : {};

        if (infoFormData.validade_cnh) { await directus.request(createItem('cnh', { motorista_id: newDriver.id, validade: formatDateForAPI(infoFormData.validade_cnh), ...telPayloadNew })); relatedCreated = true; }
        if (infoFormData.numero_antt) { await directus.request(createItem('antt', { motorista_id: newDriver.id, numero_antt: infoFormData.numero_antt, ...telPayloadNew })); relatedCreated = true; }
        if (infoFormData.cep) { await directus.request(createItem('comprovante_endereco', { motorista_id: newDriver.id, cep: infoFormData.cep, ...telPayloadNew })); relatedCreated = true; }
        if (relatedCreated) { await fetchRelatedData(); }
      }
      return resultDriver;
    };

    try {
      setLoading(true);
      try {
        const resultDriver = await performSave();
        setIsEditingInfo(false);
        if (onUpdate) onUpdate(resultDriver || undefined);
      } catch (error: any) {
        if (error.message?.includes('Token expired') || error.message?.includes('401') ||
          (error.errors && error.errors[0]?.message === 'Token expired.')) {
          console.log('Token expirado, tentando refresh...');
          try {
            await refreshToken();
            const resultDriver = await performSave();
            setIsEditingInfo(false);
            if (onUpdate) onUpdate(resultDriver || undefined);
          } catch (refreshError) {
            console.error('Refresh falhou', refreshError);
            logout();
            toast({ variant: 'destructive', title: 'Sessão Expirada', description: 'Por favor, faça login novamente.' });
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: String(error) });
    } finally {
      setLoading(false);
    }
  };
  const handleCancelEditInfo = () => { setIsEditingInfo(false); setInfoFormData({}); };

  const handleStatusChange = (v: string) => {
    const newStatus = v === '_empty_' ? '' : v;
    const cnhStatus = getCnhStatus(data.cnh?.validade);
    if (cnhStatus === 'Expirado' && newStatus !== 'NECESSARIO ATUALIZAR' && newStatus !== 'BLOQUEADO' && newStatus !== 'REPROVADO' && newStatus !== '') {
      if (!window.confirm(`Atenção: A CNH deste motorista está EXPIRADA!\n\nTem certeza que deseja forçar o farol para ${newStatus} mesmo com a validade vencida?`)) {
        return;
      }
    }
    setInfoFormData({ ...infoFormData, status_cadastro: newStatus });
  };

  const handleEditDoc = (type: 'cnh' | 'crlv' | 'antt' | 'comprovante_endereco', currentData: any) => {
    const formMap = { cnh: setCnhForm, crlv: setCrlvForm, antt: setAnttForm, comprovante_endereco: setAddressForm };
    const stateMap = { cnh: setIsEditingCNH, crlv: setIsEditingCRLV, antt: setIsEditingANTT, comprovante_endereco: setIsEditingAddress };

    // Copy data to form state
    formMap[type](currentData ? { ...currentData } : {});
    stateMap[type](true);
  };

  const handleSaveDoc = async (type: 'cnh' | 'crlv' | 'antt' | 'comprovante_endereco', formData: any, currentData: any) => {
    try {
      setLoading(true);
      const stateMap = { cnh: setIsEditingCNH, crlv: setIsEditingCRLV, antt: setIsEditingANTT, comprovante_endereco: setIsEditingAddress };

      const payload = { ...formData };
      
      // Alguns schemas no Directus exigem o telefone como campo obrigatório
      if (localDriverData?.telefone) {
        payload.telefone = localDriverData.telefone;
      }
      
      const dateFields = ['data_nasc', 'validade', 'emissao_cnh', 'primeira_habilitacao'];
      for (const field of dateFields) {
        if (payload[field]) {
          payload[field] = formatDateForAPI(payload[field]);
        }
      }

      try {
        if (currentData?.id) {
          await directus.request(updateItem(type, currentData.id, payload));
          toast({ title: `${type.toUpperCase()} atualizado` });
        } else {
          await directus.request(createItem(type, { ...payload, motorista_id: driverData.id }));
          toast({ title: `${type.toUpperCase()} criado` });
        }
      } catch (error: any) {
        // Se o token expirou, tenta refresh e retry
        if (error.message?.includes('Token expired') || error.message?.includes('401') ||
          (error.errors && error.errors[0]?.message === 'Token expired.')) {
          console.log('Token expirado ao salvar documento, tentando refresh...');
          try {
            await refreshToken();
            console.log('Token renovado, tentando salvar novamente...');

            // Retry a operação após refresh
            if (currentData?.id) {
              await directus.request(updateItem(type, currentData.id, payload));
              toast({ title: `${type.toUpperCase()} atualizado` });
            } else {
              await directus.request(createItem(type, { ...payload, motorista_id: driverData.id }));
              toast({ title: `${type.toUpperCase()} criado` });
            }
          } catch (refreshError) {
            console.error('Refresh falhou durante salvamento de documento', refreshError);
            logout();
            toast({
              variant: 'destructive',
              title: 'Sessão Expirada',
              description: 'Por favor, faça login novamente.'
            });
            return;
          }
        } else {
          // Outro tipo de erro, propaga
          throw error;
        }
      }

      stateMap[type](false);
      await fetchRelatedData();
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro', description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDoc = (type: 'cnh' | 'crlv' | 'antt' | 'comprovante_endereco') => {
    const stateMap = { cnh: setIsEditingCNH, crlv: setIsEditingCRLV, antt: setIsEditingANTT, comprovante_endereco: setIsEditingAddress };
    stateMap[type](false);
  }

  const handleEditCarreta = (index: number, carretaData: any) => {
    setCurrentCarretaIndex(index);
    setCarretaForm(carretaData ? { ...carretaData } : {});
    setIsEditingCarreta(true);
  };

  const handleSaveCarreta = async () => {
    if (currentCarretaIndex === null) return;
    const currentCarreta = data.carretas[currentCarretaIndex];
    if (!currentCarreta) return;

    const performSave = async () => {
      const carretaPayload = { ...carretaForm };
      if (localDriverData?.telefone) {
        carretaPayload.telefone = localDriverData.telefone;
      }

      if (currentCarreta.data?.id) {
        await directus.request(updateItem(currentCarreta.collection, currentCarreta.data.id, carretaPayload));
        toast({ title: `${currentCarreta.type} atualizada` });
      } else {
        await directus.request(createItem(currentCarreta.collection, { ...carretaPayload, motorista_id: driverData.id }));
        toast({ title: `${currentCarreta.type} criada` });
      }
    };

    try {
      setLoading(true);
      try {
        await performSave();
        setIsEditingCarreta(false);
        setCurrentCarretaIndex(null);
        await fetchRelatedData();
      } catch (error: any) {
        if (error.message?.includes('Token expired') || error.message?.includes('401') ||
          (error.errors && error.errors[0]?.message === 'Token expired.')) {
          console.log('Token expirado, tentando refresh...');
          try {
            await refreshToken();
            await performSave();
            setIsEditingCarreta(false);
            setCurrentCarretaIndex(null);
            await fetchRelatedData();
          } catch (refreshError) {
            console.error('Refresh falhou', refreshError);
            logout();
            toast({ variant: 'destructive', title: 'Sessão Expirada', description: 'Por favor, faça login novamente.' });
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: String(error) });
    } finally {
      setLoading(false);
    }
  };
  const handleCancelCarreta = () => { setIsEditingCarreta(false); setCurrentCarretaIndex(null); setCarretaForm({}); };


  // Render Helper for Input Fields


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6" />
              {localDriverData?.id ? `Perfil: ${driverName || localDriverData.nome}` : 'Novo Motorista'}
              {localDriverData?.status && (
                <Badge variant={localDriverData.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                  {localDriverData.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Gerenciar perfil, documentos e fotos do motorista</DialogDescription>
          </DialogHeader>

          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-md">
                <div className="text-sm font-semibold">Carregando informações...</div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="docs" disabled={!localDriverData?.id}>Documentos</TabsTrigger>
                <TabsTrigger value="fotos" disabled={!localDriverData?.id}>Fotos</TabsTrigger>
                <TabsTrigger value="disponibilidade" disabled={!localDriverData?.id}>Disponibilidade</TabsTrigger>
              </TabsList>

              {!localDriverData?.id && (
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md my-4 text-sm border border-yellow-200">
                  Salve as informações básicas para liberar o cadastro de documentos e veículos.
                </div>
              )}

              {/* GERAL TAB */}
              <TabsContent value="geral" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 justify-between">
                      Informações Básicas
                      {!isEditingInfo ? (
                        <Button variant="ghost" size="sm" onClick={() => handleEditInfo()}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelEditInfo}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
                          <Button size="sm" onClick={handleSaveInfo}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {isEditingInfo ? (
                      <>
                        <InputField label="Nome Completo" value={infoFormData.nome} onChange={(v: any) => setInfoFormData({ ...infoFormData, nome: v })} />
                        <InputField label="Telefone" value={infoFormData.telefone} onChange={(v: any) => setInfoFormData({ ...infoFormData, telefone: v })} />
                        <InputField label="Forma Pagamento (ex: Pix)" value={infoFormData.forma_pagamento} onChange={(v: any) => setInfoFormData({ ...infoFormData, forma_pagamento: v })} />
                        <InputField label="CPF" value={infoFormData.cpf} onChange={(v: any) => setInfoFormData({ ...infoFormData, cpf: v })} />
                        
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Faróis</span>
                          <Select value={infoFormData.status_cadastro || '_empty_'} onValueChange={handleStatusChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o farol" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              {STATUS_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${opt.color.replace('hover:', '').split(' ')[0]}`} />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <InputField label="Vencimento CX" isDate={true} value={infoFormData.vencimento_cx} onChange={(v: any) => setInfoFormData({ ...infoFormData, vencimento_cx: v })} />
                        <InputField label="Validade CNH" isDate={true} value={infoFormData.validade_cnh} onChange={(v: any) => setInfoFormData({ ...infoFormData, validade_cnh: v })} />
                        <InputField label="Número ANTT" value={infoFormData.numero_antt} onChange={(v: any) => setInfoFormData({ ...infoFormData, numero_antt: v })} />
                        <InputField label="CEP do Comprovante" value={infoFormData.cep} onChange={(v: any) => setInfoFormData({ ...infoFormData, cep: v })} />
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Cadastrado</span>
                          <Input disabled value={formatDate(localDriverData?.date_created)} className="bg-muted text-muted-foreground cursor-not-allowed" />
                        </div>
                      </>
                    ) : (
                      <>
                        <FieldRow label="Nome Completo" value={localDriverData?.nome || ''} />
                        <FieldRow label="CPF" value={localDriverData?.cpf} />
                        <FieldRow label="Telefone" value={localDriverData?.telefone} />
                        <FieldRow label="Forma Pgto" value={localDriverData?.forma_pagamento} />
                        <FieldRow label="Número ANTT" value={data.antt?.numero_antt} />
                        <FieldRow label="CEP (Comprovante)" value={data.comprovante_endereco?.cep} />
                        <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 h-9">
                          <span className="text-sm text-muted-foreground">Faróis:</span>
                          <Badge className={`${getStatusBadgeColor(localDriverData?.status_cadastro)} text-xs border-transparent shadow-sm`} variant="outline">
                            {localDriverData?.status_cadastro || '(vazio)'}
                          </Badge>
                        </div>
                        <FieldRow label="Vencimento CX" value={formatDate(localDriverData?.vencimento_cx)} />
                        
                        <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 h-9">
                          <span className="text-sm text-muted-foreground">Validade CNH:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-right truncate max-w-[200px]">{formatDate(data.cnh?.validade)}</span>
                            {data.cnh?.validade && (
                              <Badge className={`text-[10px] px-1.5 h-5 ${getCnhStatus(data.cnh?.validade) === 'No Prazo' ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-red-600 hover:bg-red-600 text-white'}`}>
                                {getCnhStatus(data.cnh?.validade)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <FieldRow label="Cadastrado" value={formatDate(localDriverData?.date_created)} />
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DOCUMENTOS TAB */}
              <TabsContent value="docs" className="space-y-4 mt-4">
                {/* CNH */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                    <CardTitle className="text-base flex justify-between items-center">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> CNH</div>
                      {!isEditingCNH ? (
                        <Button variant="ghost" size="sm" onClick={() => handleEditDoc('cnh', data.cnh)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar / Anexar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleCancelDoc('cnh')}><X className="h-3 w-3" /></Button>
                          <Button size="sm" onClick={() => handleSaveDoc('cnh', cnhForm, data.cnh)}><Save className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid gap-1 md:grid-cols-2">
                    {isEditingCNH ? (
                      <>
                        <CpfInputField label="CPF" value={cnhForm.cpf} onChange={(v: any) => setCnhForm({ ...cnhForm, cpf: v })} referenceCpf={localDriverData?.cpf} />
                        <InputField label="Data Nasc" isDate={true} value={cnhForm.data_nasc} onChange={(v: any) => setCnhForm({ ...cnhForm, data_nasc: v })} />
                        <InputField label="Nome Mãe" value={cnhForm.nome_mae} onChange={(v: any) => setCnhForm({ ...cnhForm, nome_mae: v })} />
                        <InputField label="Registro CNH" value={cnhForm.n_registro_cnh} onChange={(v: any) => setCnhForm({ ...cnhForm, n_registro_cnh: v })} />
                        <InputField label="Nº Formulário Espelho" value={cnhForm.n_formulario_cnh} onChange={(v: any) => setCnhForm({ ...cnhForm, n_formulario_cnh: v })} />
                        <InputField label="Validade CNH" isDate={true} value={cnhForm.validade} onChange={(v: any) => setCnhForm({ ...cnhForm, validade: v })} />
                        <InputField label="Emissão CNH" isDate={true} value={cnhForm.emissao_cnh} onChange={(v: any) => setCnhForm({ ...cnhForm, emissao_cnh: v })} />
                        <InputField label="Nº CNH Segurança" value={cnhForm.n_cnh_seguranca} onChange={(v: any) => setCnhForm({ ...cnhForm, n_cnh_seguranca: v })} />
                        <InputField label="Nº CNH Renach" value={cnhForm.n_cnh_renach} onChange={(v: any) => setCnhForm({ ...cnhForm, n_cnh_renach: v })} />
                        <InputField label="1ª Habilitacao" isDate={true} value={cnhForm.primeira_habilitacao} onChange={(v: any) => setCnhForm({ ...cnhForm, primeira_habilitacao: v })} />
                        <InputField label="Categoria" value={cnhForm.categoria} onChange={(v: any) => setCnhForm({ ...cnhForm, categoria: v })} />
                        <InputField label="Cidade Emissão" value={cnhForm.cidade_emissao} onChange={(v: any) => setCnhForm({ ...cnhForm, cidade_emissao: v })} />

                        <div className="col-span-2">
                          <span className="text-sm text-muted-foreground">Dados OCR / Observações</span>
                          <Textarea value={cnhForm.observacao || ''} onChange={(e) => setCnhForm({ ...cnhForm, observacao: e.target.value })} rows={3} placeholder="Texto extraído pelo OCR aparecerá aqui..." />
                        </div>
                        <div className="col-span-2 mt-2">
                          <AttachmentEditor
                            label="Anexo CNH"
                            value={cnhForm.link}
                            onChange={(v: any) => setCnhForm({ ...cnhForm, link: v })}
                            uploadingId="cnh_upload"
                            onOcrResult={(text: string) => setCnhForm((prev: any) => parseCnhOcrData(text, prev))}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <FieldRow label="CPF" value={data.cnh?.cpf} />
                        <FieldRow label="Data Nasc" value={formatDate(data.cnh?.data_nasc)} />
                        <FieldRow label="Nome Mãe" value={data.cnh?.nome_mae} />
                        <FieldRow label="Registro CNH" value={data.cnh?.n_registro_cnh} />
                        <FieldRow label="Formulário CNH" value={data.cnh?.n_formulario_cnh} />
                        <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 h-9">
                          <span className="text-sm text-muted-foreground">Validade:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-right truncate max-w-[200px]">{formatDate(data.cnh?.validade)}</span>
                            {data.cnh?.validade && (
                              <Badge className={`text-[10px] px-1.5 h-5 ${getCnhStatus(data.cnh?.validade) === 'No Prazo' ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-red-600 hover:bg-red-600 text-white'}`}>
                                {getCnhStatus(data.cnh?.validade)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <FieldRow label="Emissão CNH" value={formatDate(data.cnh?.emissao_cnh)} />
                        <FieldRow label="CNH Segurança" value={data.cnh?.n_cnh_seguranca} />
                        <FieldRow label="CNH Renach" value={data.cnh?.n_cnh_renach} />
                        <FieldRow label="1ª Habilitação" value={formatDate(data.cnh?.primeira_habilitacao)} />
                        <FieldRow label="Categoria" value={data.cnh?.categoria} />
                        <FieldRow label="Cidade Emissão" value={data.cnh?.cidade_emissao} />

                        <AttachmentPreview label="Anexo CNH" value={data.cnh?.link} />
                        {data.cnh?.observacao && (
                          <div className="col-span-2 mt-2 p-2 bg-muted/20 rounded text-xs">
                            <span className="font-semibold">OCR/Obs:</span> {data.cnh.observacao}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* CRLV */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                    <CardTitle className="text-base flex justify-between items-center">
                      <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> CRLV (Cavalo)</div>
                      {!isEditingCRLV ? (
                        <Button variant="ghost" size="sm" onClick={() => handleEditDoc('crlv', data.crlv)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar / Anexar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleCancelDoc('crlv')}><X className="h-3 w-3" /></Button>
                          <Button size="sm" onClick={() => handleSaveDoc('crlv', crlvForm, data.crlv)}><Save className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid gap-1 md:grid-cols-2">
                    {isEditingCRLV ? (
                      <>
                        <InputField label="Placa" value={crlvForm.placa_cavalo} onChange={(v: any) => setCrlvForm({ ...crlvForm, placa_cavalo: v })} />
                        <InputField label="Proprietário" value={crlvForm.nome_proprietario} onChange={(v: any) => setCrlvForm({ ...crlvForm, nome_proprietario: v })} />
                        <CpfInputField label="CPF/CNPJ Prop." value={crlvForm.cnpj_cpf} onChange={(v: any) => setCrlvForm({ ...crlvForm, cnpj_cpf: v })} referenceCpf={localDriverData?.cpf} />
                        <InputField label="Renavam" value={crlvForm.renavam} onChange={(v: any) => setCrlvForm({ ...crlvForm, renavam: v })} />
                        <InputField label="Modelo" value={crlvForm.modelo} onChange={(v: any) => setCrlvForm({ ...crlvForm, modelo: v })} />
                        <InputField label="Ano Fab" value={crlvForm.ano_fabricacao} onChange={(v: any) => setCrlvForm({ ...crlvForm, ano_fabricacao: v })} />
                        <InputField label="Ano Mod" value={crlvForm.ano_modelo} onChange={(v: any) => setCrlvForm({ ...crlvForm, ano_modelo: v })} />
                        <InputField label="Nr. Certificado" value={crlvForm.nr_certificado} onChange={(v: any) => setCrlvForm({ ...crlvForm, nr_certificado: v })} />
                        <InputField label="Exercício Doc" value={crlvForm.exercicio_doc} onChange={(v: any) => setCrlvForm({ ...crlvForm, exercicio_doc: v })} />
                        <InputField label="Cor" value={crlvForm.cor} onChange={(v: any) => setCrlvForm({ ...crlvForm, cor: v })} />
                        <InputField label="Chassi" value={crlvForm.chassi} onChange={(v: any) => setCrlvForm({ ...crlvForm, chassi: v })} />
                        <InputField label="Cidade Emplacado" value={crlvForm.cidade_emplacado} onChange={(v: any) => setCrlvForm({ ...crlvForm, cidade_emplacado: v })} />

                        <div className="col-span-2">
                          <span className="text-sm text-muted-foreground">Dados OCR / Observações</span>
                          <Textarea value={crlvForm.observacao || ''} onChange={(e) => setCrlvForm({ ...crlvForm, observacao: e.target.value })} rows={3} placeholder="Texto extraído pelo OCR aparecerá aqui..." />
                        </div>
                        <div className="col-span-2 mt-2">
                          <AttachmentEditor
                            label="Anexo CRLV"
                            value={crlvForm.link}
                            onChange={(v: any) => setCrlvForm({ ...crlvForm, link: v })}
                            uploadingId="crlv_upload"
                            onOcrResult={(text: string) => setCrlvForm((prev: any) => ({ ...prev, observacao: prev.observacao ? prev.observacao + '\n\n[OCR]: ' + text : '[OCR]: ' + text }))}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <FieldRow label="Placa" value={data.crlv?.placa_cavalo} />
                        <FieldRow label="Proprietário" value={data.crlv?.nome_proprietario} />
                        <FieldRow label="CPF/CNPJ" value={data.crlv?.cnpj_cpf} />
                        <FieldRow label="Renavam" value={data.crlv?.renavam} />
                        <FieldRow label="Modelo" value={data.crlv?.modelo} />
                        <FieldRow label="Ano Fab" value={data.crlv?.ano_fabricacao} />
                        <FieldRow label="Ano Mod" value={data.crlv?.ano_modelo} />
                        <FieldRow label="Nr. Certificado" value={data.crlv?.nr_certificado} />
                        <FieldRow label="Exercício Doc" value={data.crlv?.exercicio_doc} />
                        <FieldRow label="Cor" value={data.crlv?.cor} />
                        <FieldRow label="Chassi" value={data.crlv?.chassi} />
                        <FieldRow label="Cidade Emplacado" value={data.crlv?.cidade_emplacado} />

                        <AttachmentPreview label="Anexo CRLV" value={data.crlv?.link} />
                        {data.crlv?.observacao && (
                          <div className="col-span-2 mt-2 p-2 bg-muted/20 rounded text-xs">
                            <span className="font-semibold">OCR/Obs:</span> {data.crlv.observacao}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Address */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                    <CardTitle className="text-base flex justify-between items-center">
                      <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Comprovante de Endereço</div>
                      {!isEditingAddress ? (
                        <Button variant="ghost" size="sm" onClick={() => handleEditDoc('comprovante_endereco', data.comprovante_endereco)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar / Anexar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleCancelDoc('comprovante_endereco')}><X className="h-3 w-3" /></Button>
                          <Button size="sm" onClick={() => handleSaveDoc('comprovante_endereco', addressForm, data.comprovante_endereco)}><Save className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid gap-1 md:grid-cols-2">
                    {isEditingAddress ? (
                      <>
                        <div className="col-span-2"><InputField label="CEP" value={addressForm.cep} onChange={(v: any) => setAddressForm({ ...addressForm, cep: v })} /></div>
                        <InputField label="Endereço" value={addressForm.endereco} onChange={(v: any) => setAddressForm({ ...addressForm, endereco: v })} />
                        <InputField label="Número" value={addressForm.numero} onChange={(v: any) => setAddressForm({ ...addressForm, numero: v })} />
                        <InputField label="Bairro" value={addressForm.bairro} onChange={(v: any) => setAddressForm({ ...addressForm, bairro: v })} />
                        <InputField label="Cidade" value={addressForm.cidade} onChange={(v: any) => setAddressForm({ ...addressForm, cidade: v })} />
                        <InputField label="Estado" value={addressForm.estado} onChange={(v: any) => setAddressForm({ ...addressForm, estado: v })} />
                        <div className="col-span-2">
                          <span className="text-sm text-muted-foreground">Dados OCR / Observações</span>
                          <Textarea value={addressForm.observacao || ''} onChange={(e) => setAddressForm({ ...addressForm, observacao: e.target.value })} rows={3} placeholder="Texto extraído pelo OCR aparecerá aqui..." />
                        </div>
                        <div className="col-span-2 mt-2">
                          <AttachmentEditor
                            label="Comp. Endereço"
                            value={addressForm.link}
                            onChange={(v: any) => setAddressForm({ ...addressForm, link: v })}
                            uploadingId="addr_upload"
                            onOcrResult={(text: string) => setAddressForm((prev: any) => ({ ...prev, observacao: prev.observacao ? prev.observacao + '\n\n[OCR]: ' + text : '[OCR]: ' + text }))}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <FieldRow label="CEP" value={data.comprovante_endereco?.cep} />
                        <FieldRow label="Endereço" value={data.comprovante_endereco?.endereco} />
                        <FieldRow label="Número" value={data.comprovante_endereco?.numero} />
                        <FieldRow label="Bairro" value={data.comprovante_endereco?.bairro} />
                        <FieldRow label="Cidade" value={data.comprovante_endereco?.cidade} />
                        <FieldRow label="UF" value={data.comprovante_endereco?.estado} />
                        <AttachmentPreview label="Comp. Endereço" value={data.comprovante_endereco?.link} />
                        {data.comprovante_endereco?.observacao && (
                          <div className="col-span-2 mt-2 p-2 bg-muted/20 rounded text-xs">
                            <span className="font-semibold">OCR/Obs:</span> {data.comprovante_endereco.observacao}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* ANTT */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                    <CardTitle className="text-base flex justify-between items-center">
                      <div className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> ANTT</div>
                      {!isEditingANTT ? (
                        <Button variant="ghost" size="sm" onClick={() => handleEditDoc('antt', data.antt)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar / Anexar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleCancelDoc('antt')}><X className="h-3 w-3" /></Button>
                          <Button size="sm" onClick={() => handleSaveDoc('antt', anttForm, data.antt)}><Save className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid gap-1 md:grid-cols-2">
                    {isEditingANTT ? (
                      <>
                        <InputField label="Número ANTT" value={anttForm.numero_antt} onChange={(v: any) => setAnttForm({ ...anttForm, numero_antt: v })} />
                        <CpfInputField label="CNPJ/CPF" value={anttForm.cnpj_cpf} onChange={(v: any) => setAnttForm({ ...anttForm, cnpj_cpf: v })} referenceCpf={localDriverData?.cpf} />
                        <InputField label="Nome" value={anttForm.nome} onChange={(v: any) => setAnttForm({ ...anttForm, nome: v })} />
                        <div className="col-span-2">
                          <span className="text-sm text-muted-foreground">Dados OCR / Observações</span>
                          <Textarea value={anttForm.observacao || ''} onChange={(e) => setAnttForm({ ...anttForm, observacao: e.target.value })} rows={3} placeholder="Texto extraído pelo OCR aparecerá aqui..." />
                        </div>
                        <div className="col-span-2 mt-2">
                          <AttachmentEditor
                            label="Anexo ANTT"
                            value={anttForm.link}
                            onChange={(v: any) => setAnttForm({ ...anttForm, link: v })}
                            uploadingId="antt_upload"
                            onOcrResult={(text: string) => setAnttForm((prev: any) => ({ ...prev, observacao: prev.observacao ? prev.observacao + '\n\n[OCR]: ' + text : '[OCR]: ' + text }))}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <FieldRow label="Número ANTT" value={data.antt?.numero_antt} />
                        <FieldRow label="CNPJ/CPF" value={data.antt?.cnpj_cpf} />
                        <FieldRow label="Nome" value={data.antt?.nome} />
                        <AttachmentPreview label="Anexo ANTT" value={data.antt?.link} />
                        {data.antt?.observacao && (
                          <div className="col-span-2 mt-2 p-2 bg-muted/20 rounded text-xs">
                            <span className="font-semibold">OCR/Obs:</span> {data.antt.observacao}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
                {/* CARRETAS (Agora dentro de docs) */}
                {data.carretas.map((carreta: any, index: number) => {
                  const isEditingThis = isEditingCarreta && currentCarretaIndex === index;
                  return (
                    <Card key={index}>
                      <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                        <CardTitle className="flex items-center gap-2 text-base justify-between">
                          <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> {carreta.type}</div>
                          {!isEditingThis ? (
                            <Button variant="ghost" size="sm" onClick={() => handleEditCarreta(index, carreta.data)}>
                              <Pencil className="h-3 w-3 mr-2" /> Editar / Anexar
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={handleCancelCarreta}><X className="h-3 w-3" /></Button>
                              <Button size="sm" onClick={handleSaveCarreta}><Save className="h-3 w-3" /></Button>
                            </div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 grid gap-1 md:grid-cols-2 lg:grid-cols-3">
                        {isEditingThis ? (
                          <>
                            <InputField label="Placa" value={carretaForm.placa} onChange={(v: any) => setCarretaForm({ ...carretaForm, placa: v })} />
                            <InputField label="Renavam" value={carretaForm.renavam} onChange={(v: any) => setCarretaForm({ ...carretaForm, renavam: v })} />
                            <InputField label="Proprietário" value={carretaForm.proprietario_documento} onChange={(v: any) => setCarretaForm({ ...carretaForm, proprietario_documento: v })} />
                            <InputField label="CPF/CNPJ" value={carretaForm.cnpj_cpf_proprietario} onChange={(v: any) => setCarretaForm({ ...carretaForm, cnpj_cpf_proprietario: v })} />
                            <InputField label="Modelo" value={carretaForm.modelo} onChange={(v: any) => setCarretaForm({ ...carretaForm, modelo: v })} />
                            <InputField label="Ano Fab" value={carretaForm.ano_fabricacao} onChange={(v: any) => setCarretaForm({ ...carretaForm, ano_fabricacao: v })} />
                            <InputField label="Ano Mod" value={carretaForm.ano_modelo} onChange={(v: any) => setCarretaForm({ ...carretaForm, ano_modelo: v })} />
                            <div className="col-span-full">
                              <span className="text-sm text-muted-foreground">Dados OCR (Observações)</span>
                              <Textarea value={carretaForm.observacao || ''} onChange={(e) => setCarretaForm({ ...carretaForm, observacao: e.target.value })} rows={3} placeholder="Texto extraído..." />
                            </div>
                            <div className="col-span-full pt-2">
                              <AttachmentEditor
                                label="Anexo Carreta"
                                value={carretaForm.link}
                                onChange={(v: any) => setCarretaForm({ ...carretaForm, link: v })}
                                uploadingId={`cart_${index}`}
                                onOcrResult={(text: string) => setCarretaForm((prev: any) => ({ ...prev, observacao: prev.observacao ? prev.observacao + '\n\n[OCR]: ' + text : '[OCR]: ' + text }))}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <FieldRow label="Placa" value={carreta.data?.placa} />
                            <FieldRow label="Renavam" value={carreta.data?.renavam} />
                            <FieldRow label="Proprietário" value={carreta.data?.proprietario_documento} />
                            <FieldRow label="CPF/CNPJ" value={carreta.data?.cnpj_cpf_proprietario} />
                            <FieldRow label="Modelo" value={carreta.data?.modelo} />
                            <FieldRow label="Ano" value={carreta.data ? `${carreta.data.ano_fabricacao || ''}/${carreta.data.ano_modelo || ''}` : ''} />
                            <div className="col-span-full">
                              <AttachmentPreview label="Anexo Carreta" value={carreta.data?.link} />
                              {carreta.data?.observacao && (
                                <div className="mt-2 p-2 bg-muted/20 rounded text-xs">
                                  <span className="font-semibold">OCR/Obs:</span> {carreta.data.observacao}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              {/* FOTOS TAB */}
              <TabsContent value="fotos" className="space-y-4 mt-4">
                <Card>
                  <CardHeader><CardTitle>Fotos do Veículo</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground text-sm mb-4">Fotos são gerenciadas principalmente via aplicativo móvel. Aqui você pode visualizar as fotos atuais.</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Foto Cavalo', key: 'foto_cavalo', url: getAuthenticatedUrl(data.fotos?.foto_cavalo), uploadingId: 'foto_cavalo' },
                        { label: 'Foto Lateral', key: 'foto_lateral', url: getAuthenticatedUrl(data.fotos?.foto_lateral), uploadingId: 'foto_lateral' },
                        { label: 'Foto Traseira', key: 'foto_traseira', url: getAuthenticatedUrl(data.fotos?.foto_traseira), uploadingId: 'foto_traseira' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <span className="font-medium text-sm text-center">{item.label}</span>
                          {item.url ? (
                            <div
                              className="relative aspect-video bg-muted rounded-md overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity group"
                              onClick={() => setDocumentUrl(item.url)}
                            >
                              <img src={item.url} alt={item.label} className="object-cover w-full h-full" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                                <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Visualizar</span>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-video bg-muted rounded-md border flex items-center justify-center text-muted-foreground text-xs flex-col gap-1">
                              <ImageIcon className="h-5 w-5 opacity-50" />
                              Sem foto
                            </div>
                          )}

                          {/* Upload direto (público) na própria tela, sem depender de app móvel */}
                          <div className="pt-1">
                            <AttachmentEditor
                              label={`Enviar ${item.label}`}
                              value=""
                              uploadingId={item.uploadingId}
                              onChange={async (url: string) => {
                                if (!url || !driverData?.id) return;
                                try {
                                  // Garante que exista um registro em `fotos` (Admin Token)
                                  let fotosId = data.fotos?.id;
                                  const telefone = localDriverData?.telefone || driverData.telefone || '';
                                  const headers = { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' };

                                  if (!fotosId) {
                                    // 1. Busca por telefone (Admin)
                                    if (telefone) {
                                      try {
                                        const res = await fetch(`${directusUrl}/items/fotos?filter[telefone][_eq]=${telefone}&limit=1&fields=id,motorista_id`, { headers });
                                        const json = await res.json();
                                        if (json.data?.[0]) {
                                          fotosId = json.data[0].id;
                                          if (json.data[0].motorista_id !== driverData.id) {
                                            await fetch(`${directusUrl}/items/fotos/${fotosId}`, {
                                              method: 'PATCH',
                                              headers,
                                              body: JSON.stringify({ motorista_id: driverData.id })
                                            });
                                          }
                                        }
                                      } catch (e) { console.warn("Erro admin busca", e); }
                                    }

                                    // 2. Criação (Admin)
                                    if (!fotosId) {
                                      try {
                                        const res = await fetch(`${directusUrl}/items/fotos`, {
                                          method: 'POST',
                                          headers,
                                          body: JSON.stringify({ motorista_id: driverData.id, telefone })
                                        });
                                        const json = await res.json();
                                        if (!res.ok) throw new Error(JSON.stringify(json));
                                        fotosId = json.data?.id;
                                      } catch (e) {
                                        console.error("Erro admin create", e);
                                        toast({ variant: 'destructive', title: "Erro na criação", description: "Falha ao criar registro de fotos." });
                                        return;
                                      }
                                    }

                                    // Refresh na tela
                                    try {
                                      const r = await directus.request(readItems('fotos', { filter: { motorista_id: { _eq: driverData.id } } }));
                                      setData(prev => ({ ...prev, fotos: r[0] || (fotosId ? { id: fotosId } : null) }));
                                    } catch { }
                                  }

                                  // 3. Update (Admin)
                                  if (fotosId) {
                                    await fetch(`${directusUrl}/items/fotos/${fotosId}`, {
                                      method: 'PATCH',
                                      headers,
                                      body: JSON.stringify({ [item.key]: url })
                                    });
                                    toast({ title: "Foto anexada", description: `${item.label} atualizada.` });
                                    try {
                                      const r = await directus.request(readItems('fotos', { filter: { motorista_id: { _eq: driverData.id } } }));
                                      setData(prev => ({ ...prev, fotos: r[0] || prev.fotos }));
                                    } catch { }
                                  }
                                } catch (e) {
                                  console.error(e);
                                  toast({ title: "Erro ao salvar foto", description: "A foto foi enviada mas não pôde ser vinculada no Directus.", variant: "destructive" });
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-end border-t pt-4">
                      <Button 
                        onClick={() => { setDriveFolderName(localDriverData?.nome || driverData?.nome || ''); setIsDrivePopupOpen(true); }} 
                        disabled={isUploadingToDrive}
                        className="bg-green-600 hover:bg-green-700 text-white flex gap-2 items-center"
                      >
                        <CloudUpload className="h-4 w-4" /> Enviar Fotos para o Google Drive
                      </Button>
                    </div>

                    {/* Popup do Drive */}
                    <Dialog open={isDrivePopupOpen} onOpenChange={setIsDrivePopupOpen}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Enviar para o Google Drive</DialogTitle>
                          <DialogDescription className="sr-only">Confirme o nome da pasta a ser criada</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            Confirme ou edite o nome da pasta que será criada no Google Drive para armazenar as fotos deste veículo.
                          </p>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Nome da Pasta</label>
                            <Input
                              value={driveFolderName}
                              onChange={(e) => setDriveFolderName(e.target.value)}
                              placeholder="Nome do Cliente/Motorista"
                            />
                          </div>
                        </div>
                        <DialogFooter className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsDrivePopupOpen(false)} disabled={isUploadingToDrive}>
                            Cancelar
                          </Button>
                          <Button 
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                            onClick={handleUploadToDrive}
                            disabled={!driveFolderName || isUploadingToDrive}
                          >
                            {isUploadingToDrive ? (
                              <><RefreshCw className="h-4 w-4 animate-spin" /> Processando...</>
                            ) : (
                              <><CloudUpload className="h-4 w-4" /> Criar Pasta e Enviar</>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Adicionar Fotos Extras
                      </h4>
                      <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900 text-sm">
                          <p className="text-blue-700 dark:text-blue-300">
                            Você pode anexar fotos adicionais livremente. Elas serão registradas no campo de observações.
                          </p>
                        </div>

                        <AttachmentEditor
                          label="Upload de Nova Foto"
                          value=""
                          onChange={async (url: string) => {
                            if (url && data.fotos?.id) {
                              try {
                                const currentObs = data.fotos.observacao || "";
                                const dateStr = new Date().toLocaleString('pt-BR');
                                const newObs = currentObs
                                  ? `${currentObs}\n\n[${dateStr}] Foto Extra: ${url}`
                                  : `[${dateStr}] Foto Extra: ${url}`;

                                await directus.request(updateItem('fotos' as any, data.fotos.id, { observacao: newObs }));
                                toast({ title: "Foto anexada com sucesso!" });
                                // Refresh data
                                const newFotos = await directus.request(readItems('fotos', { filter: { motorista_id: { _eq: driverData.id } } }));
                                setData(prev => ({ ...prev, fotos: newFotos[0] || null }));
                              } catch (e) {
                                console.error(e);
                                toast({ title: "Erro ao salvar vínculo", description: "A foto foi enviada mas não pôde ser salva no registro.", variant: "destructive" });
                              }
                            }
                          }}
                          uploadingId="extra_photo_upload"
                        />

                        {data.fotos?.observacao && (
                          <div className="mt-4">
                            <span className="text-sm font-semibold block mb-2">Registro de Fotos Extras / Observações:</span>
                            <div className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono border">
                              {data.fotos.observacao}
                            </div>
                            {/* Simple link parser for preview */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {data.fotos.observacao.match(/https?:\/\/[^\s]+/g)?.map((link: string, i: number) => (
                                <Button key={i} variant="outline" size="sm" className="h-6 text-xs" onClick={() => setDocumentUrl(link)}>
                                  Ver Anexo {i + 1}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DISPONIBILIDADE TAB */}
              <TabsContent value="disponibilidade" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-blue-600" /> Disponibilidade (Logística)</div>
                      {!isEditingAvailability ? (
                        <Button variant="ghost" size="sm" onClick={handleEditAvailability}>
                          <Pencil className="h-4 w-4 mr-2" /> {data.disponivel ? 'Atualizar' : 'Adicionar'}
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelEdit}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
                          <Button size="sm" onClick={handleSaveAvailability}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {isEditingAvailability ? (
                      <>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Select value={editFormData.status} onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent position="popper" className="z-[9999]">
                              <SelectItem value="disponivel">Disponível</SelectItem>
                              <SelectItem value="indisponivel">Indisponível</SelectItem>
                              <SelectItem value="em_viagem">Em Viagem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <span className="text-sm text-muted-foreground flex justify-between items-center">
                            Localização (Extenso)
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 text-[10px] px-2 py-0" 
                              onClick={handleGeocodeLocation}
                              disabled={isGeocoding}
                              type="button"
                            >
                              {isGeocoding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1 text-blue-500" />}
                              GPS Auto
                            </Button>
                          </span>
                          <Input 
                            value={editFormData.localizacao_atual || ''} 
                            placeholder="Ex: São Paulo, SP"
                            onChange={(e) => setEditFormData({ ...editFormData, localizacao_atual: e.target.value })} 
                          />
                        </div>
                        <InputField label="Latitude" value={editFormData.latitude} onChange={(v: any) => setEditFormData({ ...editFormData, latitude: v })} />
                        <InputField label="Longitude" value={editFormData.longitude} onChange={(v: any) => setEditFormData({ ...editFormData, longitude: v })} />
                        <div className="flex flex-col space-y-1.5 pt-1">
                          <span className="text-sm text-muted-foreground">Data Prevista de Liberação</span>
                          <Input 
                            type="text" 
                            placeholder="DD/MM/AAAA"
                            value={editFormData.data_previsao_disponibilidade || ''} 
                            onChange={(e) => setEditFormData({ ...editFormData, data_previsao_disponibilidade: e.target.value })} 
                          />
                        </div>
                        <div className="col-span-2"><InputField label="Observação" value={editFormData.observacao} onChange={(v: any) => setEditFormData({ ...editFormData, observacao: v })} /></div>
                      </>
                    ) : (
                      <>
                        <FieldRow label="Status" value={data.disponivel?.status?.toUpperCase()} />
                        <FieldRow label="Localização" value={data.disponivel?.localizacao_atual || data.disponivel?.local_disponibilidade} />
                        <FieldRow label="Lat/Long" value={`${data.disponivel?.latitude || ''}, ${data.disponivel?.longitude || ''}`} />
                        <FieldRow label="Previsão Liberação" value={data.disponivel?.data_previsao_disponibilidade ? new Date(data.disponivel.data_previsao_disponibilidade).toLocaleDateString('pt-BR') : ''} />
                        <div className="col-span-2"><FieldRow label="Obs" value={data.disponivel?.observacao} /></div>
                        <div className="col-span-2 text-xs text-muted-foreground mt-2">Atualizado em: {formatDate(data.disponivel?.date_created)}</div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!documentUrl} onOpenChange={(open) => !open && setDocumentUrl(null)}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col bg-background">
          <DialogHeader className="px-4 py-2 border-b"><DialogTitle>Visualização</DialogTitle></DialogHeader>
          <div className="flex-1 w-full h-full bg-muted/20 relative">
            {documentUrl && <iframe src={documentUrl} className="w-full h-full absolute inset-0" title="Doc" style={{ border: 'none' }} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
