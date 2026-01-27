import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Save, CheckCircle, Edit3 } from "lucide-react";

interface OcrDocumentViewerProps {
  documentId: string;
  documentType: "delivery_receipt" | "driver_document";
  data: {
    image_url: string;
    verified: boolean;
    ocr_raw_data?: any;
    // For delivery receipts
    delivery_date?: string;
    delivery_time?: string;
    receiver_name?: string;
    receiver_signature?: string;
    observations?: string;
    // For driver documents
    document_number?: string;
    issue_date?: string;
    expiry_date?: string;
    issuing_agency?: string;
  };
  onUpdate?: () => void;
}

export const OcrDocumentViewer = ({
  documentId,
  documentType,
  data,
  onUpdate,
}: OcrDocumentViewerProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(data);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const table = documentType === "delivery_receipt" ? "delivery_receipts" : "driver_documents";
      
      const { error } = await supabase
        .from(table)
        .update({
          ...formData,
          verified: true,
        })
        .eq("id", documentId);

      if (error) throw error;

      toast({
        title: "Dados salvos",
        description: "As informações foram atualizadas com sucesso.",
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDeliveryReceiptFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="delivery_date">Data de Entrega</Label>
        <Input
          id="delivery_date"
          type="date"
          value={formData.delivery_date || ""}
          onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="delivery_time">Hora de Entrega</Label>
        <Input
          id="delivery_time"
          type="time"
          value={formData.delivery_time || ""}
          onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="receiver_name">Nome do Recebedor</Label>
        <Input
          id="receiver_name"
          value={formData.receiver_name || ""}
          onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observações</Label>
        <Textarea
          id="observations"
          value={formData.observations || ""}
          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
          disabled={!isEditing}
          rows={3}
        />
      </div>
    </>
  );

  const renderDriverDocumentFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="document_number">Número do Documento</Label>
        <Input
          id="document_number"
          value={formData.document_number || ""}
          onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="issue_date">Data de Emissão</Label>
        <Input
          id="issue_date"
          type="date"
          value={formData.issue_date || ""}
          onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiry_date">Data de Validade</Label>
        <Input
          id="expiry_date"
          type="date"
          value={formData.expiry_date || ""}
          onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="issuing_agency">Órgão Emissor</Label>
        <Input
          id="issuing_agency"
          value={formData.issuing_agency || ""}
          onChange={(e) => setFormData({ ...formData, issuing_agency: e.target.value })}
          disabled={!isEditing}
        />
      </div>
    </>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">
              {documentType === "delivery_receipt" ? "Canhoto de Entrega" : "Documento do Motorista"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {data.verified && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Verificado
              </Badge>
            )}
            {!isEditing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Editar
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormData(data);
                    setIsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <img
              src={data.image_url}
              alt="Documento"
              className="w-full rounded-lg border"
            />
          </div>
          <div className="space-y-4">
            {documentType === "delivery_receipt"
              ? renderDeliveryReceiptFields()
              : renderDriverDocumentFields()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
