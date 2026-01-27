import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Save, Eye } from "lucide-react";

interface OcrDocumentViewerProps {
  type: "delivery_receipt" | "driver_document";
  documentId: string;
  imageUrl: string;
  data: {
    delivery_date?: string;
    delivery_time?: string;
    receiver_name?: string;
    receiver_signature?: string;
    observations?: string;
    document_number?: string;
    issue_date?: string;
    expiry_date?: string;
    issuing_agency?: string;
    document_type?: string;
  };
  verified: boolean;
  ocrRawData?: any;
  onUpdate?: () => void;
}

export const OcrDocumentViewer = ({
  type,
  documentId,
  imageUrl,
  data,
  verified,
  ocrRawData,
  onUpdate,
}: OcrDocumentViewerProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState(data);
  const [isVerified, setIsVerified] = useState(verified);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const table = type === "delivery_receipt" ? "delivery_receipts" : "driver_documents";
      
      const { error } = await supabase
        .from(table)
        .update({
          ...editedData,
          verified: isVerified,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (error) throw error;

      toast({
        title: "Salvo com sucesso",
        description: "Dados atualizados no banco de dados.",
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderDeliveryReceiptFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="delivery_date">Data de Entrega</Label>
        <Input
          id="delivery_date"
          type="date"
          value={editedData.delivery_date || ""}
          onChange={(e) => setEditedData({ ...editedData, delivery_date: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="delivery_time">Hora de Entrega</Label>
        <Input
          id="delivery_time"
          type="time"
          value={editedData.delivery_time || ""}
          onChange={(e) => setEditedData({ ...editedData, delivery_time: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="receiver_name">Nome do Recebedor</Label>
        <Input
          id="receiver_name"
          value={editedData.receiver_name || ""}
          onChange={(e) => setEditedData({ ...editedData, receiver_name: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="receiver_signature">Assinatura</Label>
        <Input
          id="receiver_signature"
          value={editedData.receiver_signature || ""}
          onChange={(e) => setEditedData({ ...editedData, receiver_signature: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observações</Label>
        <Textarea
          id="observations"
          value={editedData.observations || ""}
          onChange={(e) => setEditedData({ ...editedData, observations: e.target.value })}
          disabled={!isEditing}
          rows={3}
        />
      </div>
    </>
  );

  const renderDriverDocumentFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="document_type">Tipo de Documento</Label>
        <Input
          id="document_type"
          value={editedData.document_type || ""}
          disabled
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document_number">Número do Documento</Label>
        <Input
          id="document_number"
          value={editedData.document_number || ""}
          onChange={(e) => setEditedData({ ...editedData, document_number: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="issue_date">Data de Emissão</Label>
        <Input
          id="issue_date"
          type="date"
          value={editedData.issue_date || ""}
          onChange={(e) => setEditedData({ ...editedData, issue_date: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiry_date">Data de Validade</Label>
        <Input
          id="expiry_date"
          type="date"
          value={editedData.expiry_date || ""}
          onChange={(e) => setEditedData({ ...editedData, expiry_date: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="issuing_agency">Órgão Emissor</Label>
        <Input
          id="issuing_agency"
          value={editedData.issuing_agency || ""}
          onChange={(e) => setEditedData({ ...editedData, issuing_agency: e.target.value })}
          disabled={!isEditing}
        />
      </div>
    </>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {type === "delivery_receipt" ? "Canhoto de Entrega" : "Documento do Motorista"}
          </CardTitle>
          <Badge variant={isVerified ? "default" : "secondary"}>
            {isVerified ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verificado
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Não Verificado
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt="Documento"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="space-y-4">
            {type === "delivery_receipt" ? renderDeliveryReceiptFields() : renderDriverDocumentFields()}

            <div className="flex gap-2 pt-4">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="w-full">
                  Editar
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditedData(data);
                      setIsEditing(false);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="verified"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                disabled={!isEditing}
                className="h-4 w-4"
              />
              <Label htmlFor="verified">Marcar como verificado</Label>
            </div>
          </div>
        </div>

        {ocrRawData && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Ver dados brutos do OCR
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto">
              {JSON.stringify(ocrRawData, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
};
