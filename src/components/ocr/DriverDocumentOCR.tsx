import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type DocumentType = "RG" | "CPF" | "CNH";

interface DriverDocumentData {
  id: string;
  driver_id: string;
  document_type: DocumentType;
  image_url: string;
  document_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_agency?: string;
  ocr_raw_data?: any;
  verified: boolean;
}

interface DriverDocumentOCRProps {
  driverId: string;
  documentData?: DriverDocumentData;
  onSave?: () => void;
}

export const DriverDocumentOCR = ({ driverId, documentData, onSave }: DriverDocumentOCRProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(documentData?.image_url || "");
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    document_type: documentData?.document_type || ("RG" as DocumentType),
    document_number: documentData?.document_number || "",
    issue_date: documentData?.issue_date || "",
    expiry_date: documentData?.expiry_date || "",
    issuing_agency: documentData?.issuing_agency || "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processOCR = async () => {
    if (!imagePreview) {
      toast({
        title: "Erro",
        description: "Selecione uma imagem primeiro",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-ocr', {
        body: {
          imageUrl: imagePreview,
          documentType: formData.document_type
        }
      });

      if (error) throw error;

      if (data.success) {
        setFormData({
          ...formData,
          document_number: data.data.document_number || "",
          issue_date: data.data.issue_date || "",
          expiry_date: data.data.expiry_date || "",
          issuing_agency: data.data.issuing_agency || "",
        });

        toast({
          title: "OCR Concluído",
          description: "Dados extraídos com sucesso. Revise e edite se necessário.",
        });
      }
    } catch (error: any) {
      console.error("OCR Error:", error);
      toast({
        title: "Erro no OCR",
        description: error.message || "Erro ao processar imagem",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const dataToSave = {
        driver_id: driverId,
        image_url: imagePreview,
        ...formData,
        verified: true,
      };

      if (documentData?.id) {
        const { error } = await supabase
          .from('driver_documents')
          .update(dataToSave)
          .eq('id', documentData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('driver_documents')
          .insert([dataToSave]);

        if (error) throw error;
      }

      toast({
        title: "Salvo com sucesso",
        description: "Documento salvo",
      });

      onSave?.();
    } catch (error: any) {
      console.error("Save Error:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {documentData?.verified ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          Documento do Motorista - OCR
        </CardTitle>
        <CardDescription>
          Faça upload do documento, processe com OCR e edite os dados extraídos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipo de Documento */}
        <div className="space-y-2">
          <Label>Tipo de Documento</Label>
          <Select
            value={formData.document_type}
            onValueChange={(value: DocumentType) =>
              setFormData({ ...formData, document_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RG">RG</SelectItem>
              <SelectItem value="CPF">CPF</SelectItem>
              <SelectItem value="CNH">CNH</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upload da Imagem */}
        <div className="space-y-2">
          <Label>Imagem do Documento</Label>
          <div className="flex gap-4">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="flex-1"
            />
            <Button
              onClick={processOCR}
              disabled={!imagePreview || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Processar OCR
                </>
              )}
            </Button>
          </div>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview do documento"
              className="mt-4 max-h-64 rounded-lg border"
            />
          )}
        </div>

        {/* Campos Editáveis */}
        <div className="space-y-2">
          <Label htmlFor="document_number">Número do Documento</Label>
          <Input
            id="document_number"
            value={formData.document_number}
            onChange={(e) =>
              setFormData({ ...formData, document_number: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="issue_date">Data de Emissão</Label>
            <Input
              id="issue_date"
              type="date"
              value={formData.issue_date}
              onChange={(e) =>
                setFormData({ ...formData, issue_date: e.target.value })
              }
            />
          </div>

          {formData.document_type === "CNH" && (
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Data de Validade</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) =>
                  setFormData({ ...formData, expiry_date: e.target.value })
                }
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="issuing_agency">Órgão Emissor</Label>
          <Input
            id="issuing_agency"
            value={formData.issuing_agency}
            onChange={(e) =>
              setFormData({ ...formData, issuing_agency: e.target.value })
            }
          />
        </div>

        {/* Botão Salvar */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Documento
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};