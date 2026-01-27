import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface DeliveryReceiptData {
  id: string;
  image_url: string;
  delivery_date?: string;
  delivery_time?: string;
  receiver_name?: string;
  receiver_signature?: string;
  observations?: string;
  ocr_raw_data?: any;
  verified: boolean;
}

interface DeliveryReceiptOCRProps {
  shipmentId?: string;
  receiptData?: DeliveryReceiptData;
  onSave?: () => void;
}

export const DeliveryReceiptOCR = ({ shipmentId, receiptData, onSave }: DeliveryReceiptOCRProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(receiptData?.image_url || "");
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    delivery_date: receiptData?.delivery_date || "",
    delivery_time: receiptData?.delivery_time || "",
    receiver_name: receiptData?.receiver_name || "",
    receiver_signature: receiptData?.receiver_signature || "",
    observations: receiptData?.observations || "",
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
          documentType: 'canhoto'
        }
      });

      if (error) throw error;

      if (data.success) {
        setFormData({
          delivery_date: data.data.delivery_date || "",
          delivery_time: data.data.delivery_time || "",
          receiver_name: data.data.receiver_name || "",
          receiver_signature: data.data.receiver_signature || "",
          observations: data.data.observations || "",
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
        shipment_id: shipmentId,
        image_url: imagePreview,
        ...formData,
        verified: true,
      };

      if (receiptData?.id) {
        const { error } = await supabase
          .from('delivery_receipts')
          .update(dataToSave)
          .eq('id', receiptData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_receipts')
          .insert([dataToSave]);

        if (error) throw error;
      }

      toast({
        title: "Salvo com sucesso",
        description: "Canhoto de entrega salvo",
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
          {receiptData?.verified ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          Canhoto de Entrega - OCR
        </CardTitle>
        <CardDescription>
          Faça upload do canhoto, processe com OCR e edite os dados extraídos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload da Imagem */}
        <div className="space-y-2">
          <Label>Imagem do Canhoto</Label>
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
              alt="Preview do canhoto"
              className="mt-4 max-h-64 rounded-lg border"
            />
          )}
        </div>

        {/* Campos Editáveis */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="delivery_date">Data de Entrega</Label>
            <Input
              id="delivery_date"
              type="date"
              value={formData.delivery_date}
              onChange={(e) =>
                setFormData({ ...formData, delivery_date: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_time">Hora de Entrega</Label>
            <Input
              id="delivery_time"
              type="time"
              value={formData.delivery_time}
              onChange={(e) =>
                setFormData({ ...formData, delivery_time: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="receiver_name">Nome do Recebedor</Label>
          <Input
            id="receiver_name"
            value={formData.receiver_name}
            onChange={(e) =>
              setFormData({ ...formData, receiver_name: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="receiver_signature">Assinatura</Label>
          <Input
            id="receiver_signature"
            value={formData.receiver_signature}
            onChange={(e) =>
              setFormData({ ...formData, receiver_signature: e.target.value })
            }
            placeholder="Sim/Não ou descrição"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="observations">Observações</Label>
          <Textarea
            id="observations"
            value={formData.observations}
            onChange={(e) =>
              setFormData({ ...formData, observations: e.target.value })
            }
            rows={4}
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
              Salvar Canhoto
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};