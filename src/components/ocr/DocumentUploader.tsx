import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

interface DocumentUploaderProps {
  shipmentId?: string;
  driverId?: string;
  onUploadComplete?: () => void;
}

export const DocumentUploader = ({ shipmentId, driverId, onUploadComplete }: DocumentUploaderProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um arquivo e o tipo de documento.",
        variant: "destructive",
      });
      return;
    }

    if (documentType === "delivery_receipt" && !shipmentId) {
      toast({
        title: "Erro",
        description: "ID do embarque não fornecido.",
        variant: "destructive",
      });
      return;
    }

    if (["RG", "CPF", "CNH"].includes(documentType) && !driverId) {
      toast({
        title: "Erro",
        description: "ID do motorista não fornecido.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Simular upload de imagem (você pode integrar com Supabase Storage aqui)
      const imageUrl = previewUrl; // Por enquanto usa preview local

      // Chamar edge function para processar OCR
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke("process-ocr", {
        body: { imageUrl, documentType },
      });

      if (ocrError) throw ocrError;

      console.log("Dados OCR:", ocrData);

      // Salvar no banco de dados
      if (documentType === "delivery_receipt") {
        const { error: dbError } = await supabase.from("delivery_receipts").insert({
          shipment_id: shipmentId,
          image_url: imageUrl,
          delivery_date: ocrData.data?.delivery_date,
          delivery_time: ocrData.data?.delivery_time,
          receiver_name: ocrData.data?.receiver_name,
          receiver_signature: ocrData.data?.receiver_signature,
          observations: ocrData.data?.observations,
          ocr_raw_data: ocrData.raw_response,
          verified: false,
        });

        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from("driver_documents").insert({
          driver_id: driverId,
          document_type: documentType,
          image_url: imageUrl,
          document_number: ocrData.data?.document_number,
          issue_date: ocrData.data?.issue_date,
          expiry_date: ocrData.data?.expiry_date,
          issuing_agency: ocrData.data?.issuing_agency,
          ocr_raw_data: ocrData.raw_response,
          verified: false,
        });

        if (dbError) throw dbError;
      }

      toast({
        title: "Upload concluído",
        description: "Documento processado com OCR e salvo com sucesso.",
      });

      setSelectedFile(null);
      setPreviewUrl("");
      setDocumentType("");
      onUploadComplete?.();
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload de Documento com OCR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="document-type">Tipo de Documento</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger id="document-type">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {shipmentId && <SelectItem value="delivery_receipt">Canhoto de Entrega</SelectItem>}
              {driverId && (
                <>
                  <SelectItem value="RG">RG</SelectItem>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="CNH">CNH</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document-file">Arquivo</Label>
          <input
            id="document-file"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>

        {previewUrl && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
          </div>
        )}

        <Button onClick={handleUpload} disabled={isUploading || !selectedFile || !documentType} className="w-full">
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando OCR...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload e Processar OCR
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
