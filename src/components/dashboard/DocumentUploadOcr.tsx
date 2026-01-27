import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2 } from "lucide-react";

interface DocumentUploadOcrProps {
  documentType: "delivery_receipt" | "driver_document";
  shipmentId?: string;
  driverId?: string;
  driverDocType?: "RG" | "CPF" | "CNH";
  onUploadComplete?: (documentId: string) => void;
}

export const DocumentUploadOcr = ({
  documentType,
  shipmentId,
  driverId,
  driverDocType,
  onUploadComplete,
}: DocumentUploadOcrProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para fazer upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload image to a temporary location or use base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        // Call OCR function
        const { data: ocrData, error: ocrError } = await supabase.functions.invoke("process-ocr", {
          body: {
            imageUrl: base64Image,
            documentType,
          },
        });

        if (ocrError) throw ocrError;

        console.log("OCR Result:", ocrData);

        // Save to database
        if (documentType === "delivery_receipt") {
          const { data: insertData, error: insertError } = await supabase
            .from("delivery_receipts")
            .insert({
              shipment_id: shipmentId,
              image_url: base64Image,
              delivery_date: ocrData.data.delivery_date,
              delivery_time: ocrData.data.delivery_time,
              receiver_name: ocrData.data.receiver_name,
              receiver_signature: ocrData.data.receiver_signature,
              observations: ocrData.data.observations,
              ocr_raw_data: ocrData.raw_ocr,
              verified: false,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          toast({
            title: "Upload concluído",
            description: "Canhoto processado com sucesso. Revise os dados extraídos.",
          });

          onUploadComplete?.(insertData.id);
        } else {
          if (!driverId || !driverDocType) {
            throw new Error("Driver ID and document type are required");
          }

          const { data: insertData, error: insertError } = await supabase
            .from("driver_documents")
            .insert({
              driver_id: driverId,
              document_type: driverDocType,
              image_url: base64Image,
              document_number: ocrData.data.document_number,
              issue_date: ocrData.data.issue_date,
              expiry_date: ocrData.data.expiry_date,
              issuing_agency: ocrData.data.issuing_agency,
              ocr_raw_data: ocrData.raw_ocr,
              verified: false,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          toast({
            title: "Upload concluído",
            description: "Documento processado com sucesso. Revise os dados extraídos.",
          });

          onUploadComplete?.(insertData.id);
        }

        setFile(null);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading:", error);
      toast({
        title: "Erro ao processar",
        description: "Não foi possível processar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Upload de {documentType === "delivery_receipt" ? "Canhoto" : "Documento"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="document-upload">Selecione o arquivo</Label>
          <Input
            id="document-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Fazer Upload e Processar OCR
            </>
          )}
        </Button>
        <p className="text-sm text-muted-foreground">
          O sistema irá extrair automaticamente as informações do documento usando IA.
          Você poderá revisar e editar os dados após o processamento.
        </p>
      </CardContent>
    </Card>
  );
};
