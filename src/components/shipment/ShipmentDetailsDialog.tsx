import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Package, DollarSign, Calendar, Mail, FileText, Upload, Eye, Download, Edit, Save, X, Trash2, FileSpreadsheet } from "lucide-react";
import { OcrDocumentViewer } from "@/components/dashboard/OcrDocumentViewer";
import { uploadPublicFile, deletePublicFileByUrl } from "@/lib/publicUpload";
import { directus, publicDirectus } from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItem, uploadFiles, deleteFile } from "@directus/sdk";
import { updateEmbarque } from "@/lib/embarques";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import DOMPurify from "dompurify";

interface ShipmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: any;
}

export const ShipmentDetailsDialog = ({ open, onOpenChange, shipment }: ShipmentDetailsDialogProps) => {
  const [deliveryReceipts, setDeliveryReceipts] = useState<any[]>([]);
  const [paymentReceipts, setPaymentReceipts] = useState<any[]>([]);
  const [shipmentDocuments, setShipmentDocuments] = useState<any[]>([]);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedData, setEditedData] = useState({
    origin: "",
    destination: "",
    cargo: "",
    value: 0,
    pickupDate: "",
    deliveryDate: ""
  });
  const [uploading, setUploading] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const paymentFileRef = useRef<HTMLInputElement>(null);
  const deliveryFileRef = useRef<HTMLInputElement>(null);
  const documentFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { refreshToken } = useAuth();

  useEffect(() => {
    if (shipment?.id && open) {
      fetchDeliveryReceipts();
      fetchPaymentReceipts();
      fetchShipmentDocuments();
      setEditedData({
        origin: shipment.origin || "",
        destination: shipment.destination || "",
        cargo: shipment.cargo || "",
        value: shipment.value || 0,
        pickupDate: shipment.pickup_date ? new Date(shipment.pickup_date).toISOString().slice(0, 16) : "",
        deliveryDate: shipment.delivery_date ? new Date(shipment.delivery_date).toISOString().slice(0, 16) : ""
      });
      setIsEditingDetails(false);
    }
  }, [shipment?.id, open]);

  const fetchDeliveryReceipts = async () => {
    if (!shipment?.id) return;

    try {
      const data = await publicDirectus.request(readItems('delivery_receipts', {
        filter: { shipment_id: { _eq: shipment.id } },
        sort: ['-date_created' as any],
        fields: ['*']
      }));
      // Map Directus file object to flat structure if needed, or keeping it as is if frontend adapts
      const mappedData = data.map((item: any) => ({
        ...item,
        file_url: item.file_url
      }));
      setDeliveryReceipts(mappedData);
    } catch (error: any) {
      // Se o erro for 401 (token expirado), tenta renovar o token
      if (error?.message?.includes('expired') || error?.response?.status === 401 || error?.status === 401) {
        try {
          await refreshToken();
          // Retry a requisição após renovar o token
          const data = await publicDirectus.request(readItems('delivery_receipts', {
            filter: { shipment_id: { _eq: shipment.id } },
            sort: ['-date_created' as any],
            fields: ['*']
          }));
          const mappedData = data.map((item: any) => ({
            ...item,
            file_url: item.file_url
          }));
          setDeliveryReceipts(mappedData);
          return;
        } catch (refreshErr) {
          console.error("Error refreshing token:", refreshErr);
        }
      }
      // Tratamento para erro 403 (Forbidden)
      if (error?.response?.status === 403 || error?.status === 403) {
        console.error("Error fetching delivery receipts: Sem permissão (403). Execute setup_documents_permissions.js");
        // Removido toast vermelho (pedido do usuário). Mantemos apenas log no console.
      } else {
        console.error("Error fetching delivery receipts:", error);
      }
    }
  };

  const fetchPaymentReceipts = async () => {
    if (!shipment?.id) return;

    try {
      const data = await publicDirectus.request(readItems('payment_receipts', {
        filter: { shipment_id: { _eq: shipment.id } },
        sort: ['-date_created' as any],
        fields: ['*']
      }));
      const mappedData = data.map((item: any) => ({
        ...item,
        file_url: item.file_url
      }));
      setPaymentReceipts(mappedData);
    } catch (error: any) {
      // Se o erro for 401 (token expirado), tenta renovar o token
      if (error?.message?.includes('expired') || error?.response?.status === 401 || error?.status === 401) {
        try {
          await refreshToken();
          // Retry a requisição após renovar o token
          const data = await publicDirectus.request(readItems('payment_receipts', {
            filter: { shipment_id: { _eq: shipment.id } },
            sort: ['-date_created' as any],
            fields: ['*']
          }));
          const mappedData = data.map((item: any) => ({
            ...item,
            file_url: item.file_url
          }));
          setPaymentReceipts(mappedData);
          return;
        } catch (refreshErr) {
          console.error("Error refreshing token:", refreshErr);
        }
      }
      // Tratamento para erro 403 (Forbidden)
      if (error?.response?.status === 403 || error?.status === 403) {
        console.error("Error fetching payment receipts: Sem permissão (403). Execute setup_documents_permissions.js");
        // Removido toast vermelho (pedido do usuário). Mantemos apenas log no console.
      } else {
        console.error("Error fetching payment receipts:", error);
      }
    }
  };

  const fetchShipmentDocuments = async () => {
    if (!shipment?.id) return;

    try {
      const data = await publicDirectus.request(readItems('shipment_documents', {
        filter: { shipment_id: { _eq: shipment.id } },
        sort: ['-date_created' as any],
        fields: ['*']
      }));
      const mappedData = data.map((item: any) => ({
        ...item,
        file_url: item.file_url
      }));
      setShipmentDocuments(mappedData);
    } catch (error: any) {
      // Se o erro for 401 (token expirado), tenta renovar o token
      if (error?.message?.includes('expired') || error?.response?.status === 401 || error?.status === 401) {
        try {
          await refreshToken();
          // Retry a requisição após renovar o token
          const data = await publicDirectus.request(readItems('shipment_documents', {
            filter: { shipment_id: { _eq: shipment.id } },
            sort: ['-date_created' as any],
            fields: ['*']
          }));
          const mappedData = data.map((item: any) => ({
            ...item,
            file_url: item.file_url
          }));
          setShipmentDocuments(mappedData);
          return;
        } catch (refreshErr) {
          console.error("Error refreshing token:", refreshErr);
        }
      }
      // Tratamento para erro 403 (Forbidden)
      if (error?.response?.status === 403 || error?.status === 403) {
        console.error("Error fetching shipment documents: Sem permissão (403). Execute setup_documents_permissions.js");
        // Removido toast vermelho (pedido do usuário). Mantemos apenas log no console.
      } else {
        console.error("Error fetching shipment documents:", error);
      }
    }
  };

  const handleFileUpload = async (file: File, bucketName: string, tableName: string, additionalData?: any) => {
    if (!shipment?.id) return;

    setUploading(true);
    try {
      // Upload público local (sem Directus Files / sem Supabase)
      const publicUrl = await uploadPublicFile({
        file,
        path: `shipments/${shipment.id}/${tableName}`,
      });

      await publicDirectus.request(createItem(tableName, {
        shipment_id: shipment.id,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        ...additionalData
      }));

      toast({ title: "Upload realizado", description: "Arquivo enviado com sucesso" });

      if (tableName === 'payment_receipts') await fetchPaymentReceipts();
      if (tableName === 'delivery_receipts') await fetchDeliveryReceipts();
      if (tableName === 'shipment_documents') await fetchShipmentDocuments();
      return;

      const formData = new FormData();
      formData.append('file', file);

      // 1. Upload file to Directus
      const fileResult = await directus.request(uploadFiles(formData));
      const fileId = fileResult.id;

      // 2. Create record in target table linking the file (Directus)
      await directus.request(createItem(tableName, {
        shipment_id: shipment.id,
        file: fileId,
        file_name: file.name,
        file_size: file.size,
        ...additionalData
      }));

      toast({ title: "Upload realizado", description: "Arquivo enviado com sucesso" });

      if (tableName === 'payment_receipts') await fetchPaymentReceipts();
      if (tableName === 'delivery_receipts') await fetchDeliveryReceipts();
      if (tableName === 'shipment_documents') await fetchShipmentDocuments();

    } catch (error: any) {
      let errorMessage = error.message || 'Erro desconhecido';
      
      // Tratamento específico para erros comuns
      if (error?.response?.status === 503 || error?.status === 503) {
        errorMessage = 'Serviço de arquivos indisponível.';
      } else if (error?.response?.status === 403 || error?.status === 403) {
        errorMessage = 'Sem permissão para fazer upload. Execute o script setup_documents_permissions.js';
      } else if (error?.response?.status === 401 || error?.status === 401) {
        // Tentar renovar token e retry
        try {
          await refreshToken();
          // Retry upload após renovar token
          const retryFormData = new FormData();
          retryFormData.append('file', file);
          const retryFileResult = await directus.request(uploadFiles(retryFormData));
          const retryFileId = retryFileResult.id;
          
          const retryInsertData = {
            shipment_id: shipment.id,
            file: retryFileId,
            file_name: file.name,
            file_size: file.size,
            ...additionalData
          };
          
          await directus.request(createItem(tableName, retryInsertData));
          
          toast({
            title: "Upload realizado",
            description: "Arquivo enviado com sucesso"
          });
          
          if (tableName === 'payment_receipts') await fetchPaymentReceipts();
          if (tableName === 'delivery_receipts') await fetchDeliveryReceipts();
          if (tableName === 'shipment_documents') await fetchShipmentDocuments();
          
          return;
        } catch (refreshErr) {
          errorMessage = 'Token expirado e não foi possível renovar. Faça login novamente.';
        }
      }
      
      // Removido toast vermelho (pedido do usuário). Se precisar, você pode adicionar um aviso não-destrutivo aqui.
      console.error("Upload error details:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (id: string, fileUrl: string, tableName: string, bucketName: string) => {
    try {
      // Extract ID from directus asset URL: .../assets/<id>
      const fileId = fileUrl.split('/').pop();

      // 1. Delete the record in the table (delivery_receipts, etc)
      await publicDirectus.request(deleteItem(tableName, id));

      // 2. Delete the actual file if we have the ID (and it looks like a valid UUID/ID)
      await deletePublicFileByUrl(fileUrl);

      if (fileId && !fileUrl.includes('supabase')) {
        await directus.request(deleteFile(fileId));
      }

      toast({
        title: "Arquivo removido",
        description: "Arquivo deletado com sucesso"
      });

      if (tableName === 'payment_receipts') await fetchPaymentReceipts();
      if (tableName === 'delivery_receipts') await fetchDeliveryReceipts();
      if (tableName === 'shipment_documents') await fetchShipmentDocuments();

    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveDetails = async () => {
    if (!shipment?.id) return;

    try {
      await updateEmbarque(shipment.id, {
        origin: editedData.origin,
        destination: editedData.destination,
        cargo_type: editedData.cargo,
        total_value: editedData.value,
        pickup_date: editedData.pickupDate || null,
        delivery_date: editedData.deliveryDate || null
      });

      // Success path handled by catch block below if error throws
    } catch (error) {
      // Toast already handled in updateEmbarque but we can keep local error state if needed
      return;
    }
    toast({
      title: "Dados atualizados",
      description: "As informações da carga foram salvas com sucesso"
    });
    setIsEditingDetails(false);
    // Update local shipment data
    if (shipment) {
      shipment.origin = editedData.origin;
      shipment.destination = editedData.destination;
      shipment.cargo = editedData.cargo;
      shipment.value = editedData.value;
      shipment.pickup_date = editedData.pickupDate;
      shipment.delivery_date = editedData.deliveryDate;
    }
  }


  if (!shipment) return null;

  const routeStates = shipment.route_states ? shipment.route_states.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

  const renderFilePreview = (file: any) => {
    const isExcel = /\.(xlsx?|xlsb|csv)$/i.test(file.file_name);
    const isPdf = /\.pdf$/i.test(file.file_name);

    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-3">
          {isExcel && <FileSpreadsheet className="h-5 w-5 text-success" />}
          {isPdf && <FileText className="h-5 w-5 text-danger" />}
          {!isExcel && !isPdf && <FileText className="h-5 w-5" />}
          <div>
            <p className="font-medium text-sm">{file.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(file.uploaded_at).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(file.file_url, '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteFile(file.id, file.file_url, 'payment_receipts', 'payment-receipts')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-3">
              <span className="font-bold">Embarque #{shipment.id}</span>
              <Badge className="bg-success text-success-foreground text-xs">
                {shipment.status || "Em Processo"}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="email">Email Original</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Informações da Carga
                  {!isEditingDetails ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingDetails(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setIsEditingDetails(false);
                        setEditedData({
                          origin: shipment.origin || "",
                          destination: shipment.destination || "",
                          cargo: shipment.cargo || "",
                          value: shipment.value || 0,
                          pickupDate: shipment.pickup_date ? new Date(shipment.pickup_date).toISOString().slice(0, 16) : "",
                          deliveryDate: shipment.delivery_date ? new Date(shipment.delivery_date).toISOString().slice(0, 16) : ""
                        });
                      }}>
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSaveDetails}>
                        <Save className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingDetails ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Origem</label>
                        <Input
                          value={editedData.origin}
                          onChange={(e) => setEditedData(prev => ({ ...prev, origin: e.target.value }))}
                          placeholder="Cidade de origem"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Destino</label>
                        <Input
                          value={editedData.destination}
                          onChange={(e) => setEditedData(prev => ({ ...prev, destination: e.target.value }))}
                          placeholder="Cidade de destino"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Tipo de Carga</label>
                        <Input
                          value={editedData.cargo}
                          onChange={(e) => setEditedData(prev => ({ ...prev, cargo: e.target.value }))}
                          placeholder="Ex: Grãos, Cereais, etc"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Valor (R$)</label>
                        <Input
                          type="number"
                          value={editedData.value}
                          onChange={(e) => setEditedData(prev => ({ ...prev, value: Number(e.target.value) }))}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Data de Coleta</label>
                        <Input
                          type="datetime-local"
                          value={editedData.pickupDate}
                          onChange={(e) => setEditedData(prev => ({ ...prev, pickupDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Data de Entrega</label>
                        <Input
                          type="datetime-local"
                          value={editedData.deliveryDate}
                          onChange={(e) => setEditedData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-success mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Origem</p>
                          <p className="font-medium">{shipment.origin}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-danger mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Destino</p>
                          <p className="font-medium">{shipment.destination}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <Package className="h-5 w-5 text-primary mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Tipo de Carga</p>
                          <p className="font-medium">{shipment.cargo}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-5 w-5 text-success mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Valor</p>
                          <p className="font-medium text-success">R$ {shipment.value?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-primary mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Data de Coleta</p>
                          <p className="font-medium">
                            {shipment.pickup_date
                              ? new Date(shipment.pickup_date).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                              : 'Não informada'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-danger mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Data de Entrega</p>
                          <p className="font-medium">
                            {shipment.delivery_date
                              ? new Date(shipment.delivery_date).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                              : 'Não informada'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {shipment.driver && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Motorista Responsável</p>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{shipment.driver}</p>
                      <Button variant="outline" size="sm">
                        Ver Perfil
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Conteúdo Original e Anexos
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shipment.email_content ? (
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Recebido:</span>{" "}
                          {new Date(shipment.created_at).toLocaleString("pt-BR")}
                        </div>
                        {shipment.email_id && (
                          <div>
                            <span className="font-medium">ID do Email:</span> {shipment.email_id}
                          </div>
                        )}
                        {shipment.client_name && (
                          <div>
                            <span className="font-medium">Cliente:</span> {shipment.client_name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
                        <p className="text-sm font-medium">Conteúdo do Email</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const blob = new Blob([shipment.email_content], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `email_embarque_${shipment.id}.html`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar HTML
                        </Button>
                      </div>
                      <div
                        className="bg-white p-6 overflow-x-auto overflow-y-auto max-h-[70vh]"
                        style={{
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '14px',
                          lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(shipment.email_content, {
                            ALLOWED_TAGS: ['html', 'head', 'body', 'meta', 'style', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'img'],
                            ALLOWED_ATTR: ['href', 'target', 'style', 'class', 'src', 'alt', 'width', 'height', 'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan', 'align', 'valign', 'bgcolor', 'http-equiv', 'content', 'type', 'dir'],
                            ADD_ATTR: ['style']
                          })
                        }}
                      />
                    </div>

                    {/* Anexos de Excel/PDF/etc */}
                    {shipmentDocuments.filter(doc => /email_attachment/i.test(doc.document_type || '')).length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm">Anexos do Email:</p>
                        {shipmentDocuments
                          .filter(doc => /email_attachment/i.test(doc.document_type || ''))
                          .map(doc => renderFilePreview(doc))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted p-8 rounded-lg text-center">
                    <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum email anexado a este embarque
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="documents" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comprovantes de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={paymentFileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.xlsb,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, 'payment-receipts', 'payment_receipts', {
                        receipt_type: 'advance_payment'
                      });
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => paymentFileRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Upload Comprovante (70-90% Adiantamento)'}
                </Button>

                {paymentReceipts.length > 0 ? (
                  <div className="space-y-2">
                    {paymentReceipts.map((receipt) => renderFilePreview(receipt))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum comprovante anexado ainda</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Canhoto de Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={deliveryFileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, 'delivery-receipts', 'delivery_receipts');
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => deliveryFileRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Upload Canhoto Manual'}
                </Button>

                {deliveryReceipts.length > 0 ? (
                  deliveryReceipts.map((receipt) => (
                    <OcrDocumentViewer
                      key={receipt.id}
                      documentId={receipt.id}
                      documentType="delivery_receipt"
                      data={{
                        image_url: receipt.image_url,
                        verified: receipt.verified,
                        ocr_raw_data: receipt.ocr_raw_data,
                        delivery_date: receipt.delivery_date,
                        delivery_time: receipt.delivery_time,
                        receiver_name: receipt.receiver_name,
                        receiver_signature: receipt.receiver_signature,
                        observations: receipt.observations,
                      }}
                      onUpdate={fetchDeliveryReceipts}
                    />
                  ))
                ) : (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Nenhum canhoto enviado ainda</p>
                    <p className="text-sm text-muted-foreground">
                      Envie manualmente ou aguarde envio via WhatsApp
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documentos Diversos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Título do documento (ex: NF-e SP, CTe MG)"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                  />
                  <input
                    ref={documentFileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.xlsb,.csv,.xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && newDocTitle.trim()) {
                        handleFileUpload(file, 'shipment-documents', 'shipment_documents', {
                          document_title: newDocTitle,
                          document_type: 'generic'
                        });
                        setNewDocTitle('');
                      } else if (!newDocTitle.trim()) {
                        toast({
                          title: "Título obrigatório",
                          description: "Digite um título para o documento",
                          variant: "destructive"
                        });
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => documentFileRef.current?.click()}
                    disabled={uploading || !newDocTitle.trim()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Anexar Documento'}
                  </Button>
                </div>

                {routeStates.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Estados da Rota:</p>
                    <div className="flex flex-wrap gap-2">
                      {routeStates.map(state => (
                        <Badge key={state} variant="outline">{state}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {shipmentDocuments.length > 0 ? (
                  <div className="space-y-2 pt-4">
                    <p className="text-sm font-medium">Documentos Anexados:</p>
                    {shipmentDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5" />
                          <div>
                            <p className="font-medium text-sm">{doc.document_title}</p>
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFile(doc.id, doc.file_url, 'shipment_documents', 'shipment-documents')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Histórico do Embarque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-success rounded-full" />
                      <div className="w-0.5 h-full bg-border" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium">Oferta Recebida</p>
                      <p className="text-sm text-muted-foreground">{shipment.deadline}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                      <div className="w-0.5 h-full bg-border" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium">Em Processo de Matching</p>
                      <p className="text-sm text-muted-foreground">Buscando motorista disponível...</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
