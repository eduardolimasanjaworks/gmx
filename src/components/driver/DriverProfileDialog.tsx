
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Pencil, User, FileText, Truck, ScrollText, X, AlertCircle, Save, Loader2, ScanText, ImageIcon, File as FileIcon, Plus } from "lucide-react";
import { directus, directusUrl } from "@/lib/directus";
import { readItems, updateItem, createItem, uploadFiles } from "@directus/sdk";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { createWorker } from 'tesseract.js';

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
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch (e) {
    return dateStr;
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

const InputField = ({ label, value, onChange, type = "text", numeric = false }: any) => {
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
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

export const DriverProfileDialog = ({ open, onOpenChange, driverName, driverData, initialEditMode = false, onUpdate }: DriverProfileDialogProps) => {
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
      const worker = await createWorker('eng');
      const ret = await worker.recognize(file);
      await worker.terminate();
      return ret.data.text;
    } catch (error) {
      console.error("OCR Error:", error);
      throw new Error("Falha ao processar OCR (tesseract)");
    } finally {
      setOcrLoading(false);
    }
  };

  const uploadToDirectusAndGetUrl = async (file: File) => {
    const token = import.meta.env.VITE_DIRECTUS_TOKEN;
    const formData = new FormData();
    formData.append("file", file);

    const endpoint = `${directusUrl}/files`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!res.ok) {
        let errorMsg = `Erro ${res.status}`;
        try {
          const errJson = await res.json();
          errorMsg = errJson.errors?.[0]?.message || errorMsg;
        } catch {
          const text = await res.text();
          // Limit text length to avoid huge error messages
          errorMsg = text.substring(0, 100) || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const json = await res.json();
      const id = json.data?.id;
      if (!id) throw new Error("Upload sem ID de retorno");

      return `${directusUrl}/assets/${id}`;
    } catch (e: any) {
      console.error("Upload Error:", e);
      const msg = e.message || String(e);
      // Special check for Failed to fetch (network/CORS/proxy issue)
      if (msg.includes("Failed to fetch")) {
        throw new Error("Erro de conexão (Failed to fetch). Verifique se o servidor backend está online ou se há bloqueios de rede.");
      }
      throw new Error("Falha no upload: " + msg);
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
            <Input type="file" disabled={isUploading || !filesServiceAvailable} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setUploadingKey(uploadingId);
                const url = await uploadToDirectusAndGetUrl(file);
                onChange(url);
                toast({ title: "Upload concluído" });

                // OCR Logic
                if (file.type.startsWith('image/') && onOcrResult) {
                  toast({ title: "Processando OCR..." });
                  const text = await performOCR(file);
                  onOcrResult(text);
                  toast({ title: "OCR Concluído", description: "Texto extraído para observação." });
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
        <Button variant="link" className="h-auto p-0 text-blue-600" onClick={() => setDocumentUrl(value)}>
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
        if (initialEditMode) handleEditInfo();
        fetchRelatedData();
      } else {
        setLocalDriverData(null);
        setEditFormData({});
        setData({ cnh: null, antt: null, crlv: null, comprovante_endereco: null, fotos: null, carretas: [], disponivel: null });
        setInfoFormData({});
        setIsEditingInfo(true);
        setLoading(false);
      }
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
      data_liberacao: src.data_liberacao ? new Date(src.data_liberacao).toISOString().split('T')[0] : '',
      observacao: src.observacao || ''
    });
    setIsEditingAvailability(true);
  };

  const handleSaveAvailability = async () => {
    try {
      setLoading(true);
      if (!localDriverData?.id) { toast({ variant: "destructive", title: "Salve o motorista antes." }); return; }
      await directus.request(createItem('disponivel', {
        motorista_id: localDriverData.id,
        status: editFormData.status,
        localizacao_atual: editFormData.localizacao_atual,
        local_disponibilidade: editFormData.localizacao_atual,
        latitude: parseNumberOrUndefined(editFormData.latitude),
        longitude: parseNumberOrUndefined(editFormData.longitude),
        data_liberacao: editFormData.data_liberacao,
        observacao: editFormData.observacao
      }));
      setIsEditingAvailability(false);
      await fetchRelatedData();
      toast({ title: "Disponibilidade atualizada" });
    } catch (error) { toast({ variant: "destructive", title: "Erro", description: String(error) }); } finally { setLoading(false); }
  };

  const handleCancelEdit = () => { setIsEditingAvailability(false); setEditFormData({}); };

  const handleEditInfo = () => {
    const sourceData = localDriverData || {};
    setInfoFormData({
      nome: sourceData.nome || '', sobrenome: sourceData.sobrenome || '', telefone: sourceData.telefone || '',
      forma_pagamento: sourceData.forma_pagamento || '', cpf: sourceData.cpf || '', cidade: sourceData.cidade || '', estado: sourceData.estado || '',
    });
    setIsEditingInfo(true);
  };
  const handleSaveInfo = async () => {
    try {
      setLoading(true);
      let resultDriver: any = null;
      if (localDriverData?.id) {
        const updated = await directus.request(updateItem('cadastro_motorista', localDriverData.id, {
          nome: infoFormData.nome, sobrenome: infoFormData.sobrenome, telefone: infoFormData.telefone,
          forma_pagamento: infoFormData.forma_pagamento, cpf: infoFormData.cpf, cidade: infoFormData.cidade, estado: infoFormData.estado,
        }));
        setLocalDriverData(updated); toast({ title: "Atualizado com sucesso" }); resultDriver = updated;
      } else {
        const newDriver = await directus.request(createItem('cadastro_motorista', {
          nome: infoFormData.nome, sobrenome: infoFormData.sobrenome, telefone: infoFormData.telefone,
          forma_pagamento: infoFormData.forma_pagamento, cpf: infoFormData.cpf, cidade: infoFormData.cidade, estado: infoFormData.estado, status: 'draft'
        }));
        setLocalDriverData(newDriver); resultDriver = newDriver; toast({ title: "Motorista criado!" });
      }
      setIsEditingInfo(false); if (onUpdate) onUpdate(resultDriver || undefined);
    } catch (error) { toast({ variant: "destructive", title: "Erro", description: String(error) }); } finally { setLoading(false); }
  };
  const handleCancelEditInfo = () => { setIsEditingInfo(false); setInfoFormData({}); };

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
      if (currentData?.id) {
        await directus.request(updateItem(type, currentData.id, formData));
        toast({ title: `${type.toUpperCase()} atualizado` });
      } else {
        await directus.request(createItem(type, { ...formData, motorista_id: driverData.id }));
        toast({ title: `${type.toUpperCase()} criado` });
      }
      stateMap[type](false);
      await fetchRelatedData();
    } catch (e) { console.error(e); toast({ variant: 'destructive', title: 'Erro', description: String(e) }); } finally { setLoading(false); }
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
    try {
      setLoading(true);
      if (currentCarreta.data?.id) {
        await directus.request(updateItem(currentCarreta.collection, currentCarreta.data.id, carretaForm));
        toast({ title: `${currentCarreta.type} atualizada` });
      } else {
        await directus.request(createItem(currentCarreta.collection, { ...carretaForm, motorista_id: driverData.id }));
        toast({ title: `${currentCarreta.type} criada` });
      }
      setIsEditingCarreta(false); setCurrentCarretaIndex(null); await fetchRelatedData();
    } catch (error) { toast({ variant: "destructive", title: "Erro", description: String(error) }); } finally { setLoading(false); }
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
          </DialogHeader>

          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-md">
                <div className="text-sm font-semibold">Carregando informações...</div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="disponibilidade" disabled={!localDriverData?.id}>Disponibilidade</TabsTrigger>
                <TabsTrigger value="docs" disabled={!localDriverData?.id}>Documentos</TabsTrigger>
                <TabsTrigger value="veiculos" disabled={!localDriverData?.id}>Veículos</TabsTrigger>
                <TabsTrigger value="fotos" disabled={!localDriverData?.id}>Fotos</TabsTrigger>
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
                        <Button variant="ghost" size="sm" onClick={handleEditInfo}>
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
                        <InputField label="Nome" value={infoFormData.nome} onChange={(v: any) => setInfoFormData({ ...infoFormData, nome: v })} />
                        <InputField label="Sobrenome" value={infoFormData.sobrenome} onChange={(v: any) => setInfoFormData({ ...infoFormData, sobrenome: v })} />
                        <InputField label="Telefone" value={infoFormData.telefone} onChange={(v: any) => setInfoFormData({ ...infoFormData, telefone: v })} />
                        <InputField label="Forma Pagamento" value={infoFormData.forma_pagamento} onChange={(v: any) => setInfoFormData({ ...infoFormData, forma_pagamento: v })} />
                        <InputField label="CPF" numeric value={infoFormData.cpf} onChange={(v: any) => setInfoFormData({ ...infoFormData, cpf: v })} />
                        <InputField label="Cidade" value={infoFormData.cidade} onChange={(v: any) => setInfoFormData({ ...infoFormData, cidade: v })} />
                        <InputField label="Estado" value={infoFormData.estado} onChange={(v: any) => setInfoFormData({ ...infoFormData, estado: v })} />
                      </>
                    ) : (
                      <>
                        <FieldRow label="Nome Completo" value={localDriverData ? `${localDriverData.nome || ''} ${localDriverData.sobrenome || ''}` : ''} />
                        <FieldRow label="CPF" value={localDriverData?.cpf} />
                        <FieldRow label="Telefone" value={localDriverData?.telefone} />
                        <FieldRow label="Forma Pgto" value={localDriverData?.forma_pagamento} />
                        <FieldRow label="Cidade" value={localDriverData?.cidade} />
                        <FieldRow label="Estado" value={localDriverData?.estado} />
                        <FieldRow label="Status" value={localDriverData?.status} />
                        <FieldRow label="Cadastrado" value={formatDate(localDriverData?.date_created)} />
                      </>
                    )}
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
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disponivel">Disponível</SelectItem>
                              <SelectItem value="indisponivel">Indisponível</SelectItem>
                              <SelectItem value="em_viagem">Em Viagem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <InputField label="Localização (Extenso)" value={editFormData.localizacao_atual} onChange={(v: any) => setEditFormData({ ...editFormData, localizacao_atual: v })} />
                        <InputField label="Latitude" value={editFormData.latitude} onChange={(v: any) => setEditFormData({ ...editFormData, latitude: v })} />
                        <InputField label="Longitude" value={editFormData.longitude} onChange={(v: any) => setEditFormData({ ...editFormData, longitude: v })} />
                        <div className="col-span-2"><InputField label="Observação" value={editFormData.observacao} onChange={(v: any) => setEditFormData({ ...editFormData, observacao: v })} /></div>
                      </>
                    ) : (
                      <>
                        <FieldRow label="Status" value={data.disponivel?.status?.toUpperCase()} />
                        <FieldRow label="Localização" value={data.disponivel?.localizacao_atual || data.disponivel?.local_disponibilidade} />
                        <FieldRow label="Lat/Long" value={`${data.disponivel?.latitude || ''}, ${data.disponivel?.longitude || ''}`} />
                        <div className="col-span-2"><FieldRow label="Obs" value={data.disponivel?.observacao} /></div>
                        <div className="col-span-2 text-xs text-muted-foreground mt-2">Atualizado em: {formatDate(data.disponivel?.date_created)}</div>
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
                        <InputField label="CPF" numeric value={cnhForm.cpf} onChange={(v: any) => setCnhForm({ ...cnhForm, cpf: v })} />
                        <InputField label="Data Nasc" type="date" value={cnhForm.data_nasc} onChange={(v: any) => setCnhForm({ ...cnhForm, data_nasc: v })} />
                        <InputField label="Nome Mãe" value={cnhForm.nome_mae} onChange={(v: any) => setCnhForm({ ...cnhForm, nome_mae: v })} />
                        <InputField label="Registro CNH" value={cnhForm.n_registro_cnh} onChange={(v: any) => setCnhForm({ ...cnhForm, n_registro_cnh: v })} />
                        <InputField label="Nº Formulário Espelho" value={cnhForm.n_formulario_cnh} onChange={(v: any) => setCnhForm({ ...cnhForm, n_formulario_cnh: v })} />
                        <InputField label="Validade" type="date" value={cnhForm.validade} onChange={(v: any) => setCnhForm({ ...cnhForm, validade: v })} />
                        <InputField label="Emissão CNH" type="date" value={cnhForm.emissao_cnh} onChange={(v: any) => setCnhForm({ ...cnhForm, emissao_cnh: v })} />
                        <InputField label="Nº CNH Segurança" value={cnhForm.n_cnh_seguranca} onChange={(v: any) => setCnhForm({ ...cnhForm, n_cnh_seguranca: v })} />
                        <InputField label="Nº CNH Renach" value={cnhForm.n_cnh_renach} onChange={(v: any) => setCnhForm({ ...cnhForm, n_cnh_renach: v })} />
                        <InputField label="1ª Habilitacao" type="date" value={cnhForm.primeira_habilitacao} onChange={(v: any) => setCnhForm({ ...cnhForm, primeira_habilitacao: v })} />
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
                            onOcrResult={(text: string) => setCnhForm((prev: any) => ({ ...prev, observacao: prev.observacao ? prev.observacao + '\n\n[OCR]: ' + text : '[OCR]: ' + text }))}
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
                        <FieldRow label="Validade" value={formatDate(data.cnh?.validade)} />
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
                        <InputField label="CPF/CNPJ Prop." numeric value={crlvForm.cnpj_cpf} onChange={(v: any) => setCrlvForm({ ...crlvForm, cnpj_cpf: v })} />
                        <InputField label="Renavam" numeric value={crlvForm.renavam} onChange={(v: any) => setCrlvForm({ ...crlvForm, renavam: v })} />
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
                        <div className="col-span-2"><InputField label="CEP" numeric value={addressForm.cep} onChange={(v: any) => setAddressForm({ ...addressForm, cep: v })} /></div>
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
                        <InputField label="CNPJ/CPF" numeric value={anttForm.cnpj_cpf} onChange={(v: any) => setAnttForm({ ...anttForm, cnpj_cpf: v })} />
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
              </TabsContent>

              {/* VEICULOS TAB */}
              <TabsContent value="veiculos" className="space-y-4 mt-4">

                {/* CAVALO (PRINCIPAL) */}
                <Card>
                  <CardHeader className="py-3 px-4 bg-muted/20 border-b">
                    <CardTitle className="text-base flex justify-between items-center">
                      <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> Dados do Cavalo (Principal)</div>
                      {!isEditingCRLV ? (
                        <Button variant="ghost" size="sm" onClick={() => handleEditDoc('crlv', data.crlv)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar
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
                        <InputField label="Modelo" value={crlvForm.modelo} onChange={(v: any) => setCrlvForm({ ...crlvForm, modelo: v })} />
                        <InputField label="Cor" value={crlvForm.cor} onChange={(v: any) => setCrlvForm({ ...crlvForm, cor: v })} />
                        <InputField label="Ano Fab" value={crlvForm.ano_fabricacao} onChange={(v: any) => setCrlvForm({ ...crlvForm, ano_fabricacao: v })} />
                        <InputField label="Renavam" numeric value={crlvForm.renavam} onChange={(v: any) => setCrlvForm({ ...crlvForm, renavam: v })} />
                        <InputField label="Chassi" value={crlvForm.chassi} onChange={(v: any) => setCrlvForm({ ...crlvForm, chassi: v })} />
                      </>
                    ) : (
                      <>
                        <FieldRow label="Placa" value={data.crlv?.placa_cavalo} />
                        <FieldRow label="Modelo" value={data.crlv?.modelo} />
                        <FieldRow label="Cor" value={data.crlv?.cor} />
                        <FieldRow label="Ano" value={data.crlv?.ano_fabricacao} />
                        <FieldRow label="Renavam" value={data.crlv?.renavam} />
                        <FieldRow label="Chassi" value={data.crlv?.chassi} />
                      </>
                    )}
                  </CardContent>
                </Card>

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
                        { label: 'Foto Cavalo', url: data.fotos?.foto_cavalo },
                        { label: 'Foto Lateral', url: data.fotos?.foto_lateral },
                        { label: 'Foto Traseira', url: data.fotos?.foto_traseira }
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <span className="font-medium text-sm text-center">{item.label}</span>
                          {item.url ? (
                            <div className="relative aspect-video bg-muted rounded-md overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity group"
                              onClick={() => setDocumentUrl(item.url)}>
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
                        </div>
                      ))}
                    </div>
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

                                await updateItem('fotos' as any, data.fotos.id, { observacao: newObs });
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
