import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmbarque } from "@/lib/embarques";
import { correlacionarEAtualizarEmbarque } from "@/lib/embarque-rota-service";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTiposOperacao } from "@/hooks/useTiposOperacao";
import { useConfigRotas } from "@/hooks/useConfigRotas";

interface CreateShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateShipmentDialog({ open, onOpenChange }: CreateShipmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tipos = [] } = useTiposOperacao();
  const { rotas = [] } = useConfigRotas();

  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    cargo_type: "",
    operacao: "",
    config_rota_id: "",
    vehicle_type: "",
    weight: "",
    total_value: "",
    driver_value: "",
    client_name: "",
    pickup_date: "",
    delivery_date: "",
    delivery_window_start: "",
    delivery_window_end: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.origin || !formData.destination) {
      toast({
        title: "Campos obrigatórios",
        description: "Origem e destino são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const criado = await createEmbarque({
        origin: formData.origin,
        destination: formData.destination,
        cargo_type: formData.cargo_type || null,
        tipo_veiculo: formData.vehicle_type || null,
        operacao: formData.operacao || null,
        total_value: formData.total_value ? parseFloat(formData.total_value) : null,
        pickup_date: formData.pickup_date || null,
        delivery_date: formData.delivery_date || null,
        delivery_window_start: formData.delivery_window_start || null,
        delivery_window_end: formData.delivery_window_end || null,
        email_content: (formData as any).email_content || null,
        status: 'new',
      }) as { id: number };

      const correlacao = await correlacionarEAtualizarEmbarque(
        criado.id,
        formData.origin,
        formData.destination,
        {
          usuario: "portal",
          operacao: formData.operacao || undefined,
          rotaIdManual: formData.config_rota_id ? Number(formData.config_rota_id) : undefined,
        },
      );

      toast({
        title: "Embarque criado!",
        description: correlacao.rota
          ? `Rota correlacionada (${correlacao.rota.origem} → ${correlacao.rota.destino}).`
          : "Sem rota configurada — associe em Rotas pendentes.",
      });

      // Refresh the board immediately
      queryClient.invalidateQueries({ queryKey: ['embarques'] });

      // Reset form
      setFormData({
        origin: "",
        destination: "",
        cargo_type: "",
        operacao: "",
        config_rota_id: "",
        vehicle_type: "",
        weight: "",
        total_value: "",
        driver_value: "",
        client_name: "",
        pickup_date: "",
        delivery_date: "",
        delivery_window_start: "",
        delivery_window_end: "",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast({
        title: "Erro ao criar embarque",
        description: "Não foi possível criar a oferta de frete.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Oferta de Frete</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origem *</Label>
              <Input
                id="origin"
                placeholder="Ex: São Paulo, SP"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                disabled={Boolean(formData.config_rota_id)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destino *</Label>
              <Input
                id="destination"
                placeholder="Ex: Rio de Janeiro, RJ"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                disabled={Boolean(formData.config_rota_id)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
            <Label htmlFor="cargo_type">Produto / Tipo de carga</Label>
            <Input
              id="cargo_type"
              placeholder="Ex: Arroz, Lata, Malte..."
              value={formData.cargo_type}
              onChange={(e) => setFormData({ ...formData, cargo_type: e.target.value })}
            />
          </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_type">Tipo de Veículo</Label>
              <Input
                id="vehicle_type"
                placeholder="Ex: Carreta, Bitrem, Truck"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Operação</Label>
              <Select
                value={formData.operacao}
                onValueChange={(val) => setFormData({ ...formData, operacao: val === "none" ? "" : val, config_rota_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a operação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não definir</SelectItem>
                  {tipos
                    .filter((t: any) => t?.ativo !== false)
                    .map((t: any) => String(t?.nome || '').trim())
                    .filter(Boolean)
                    .map((op: string) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rota</Label>
              <Select
                value={formData.config_rota_id}
                onValueChange={(val) => {
                  const actualVal = val === "none" ? "" : val;
                  const rota = rotas.find((r: any) => String(r?.id) === String(actualVal)) || null;
                  if (!actualVal) {
                    setFormData((s) => ({ ...s, config_rota_id: "" }));
                    return;
                  }
                  setFormData((s) => ({
                    ...s,
                    config_rota_id: String(actualVal),
                    origin: rota?.origem ? String(rota.origem).trim() : s.origin,
                    destination: rota?.destino ? String(rota.destino).trim() : s.destination,
                    operacao:
                      s.operacao ||
                      (rota?.operacao ? String(rota.operacao).trim() : ""),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Automática pela origem/destino" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Automática pela origem/destino</SelectItem>
                  {rotas
                    .filter((r: any) => r?.ativo !== false)
                    .filter((r: any) => !formData.operacao || String(r?.operacao || '').toUpperCase() === formData.operacao.toUpperCase())
                    .map((r: any) => (
                      <SelectItem key={String(r.id)} value={String(r.id)}>
                        {String(r.origem || '').trim()} → {String(r.destino || '').trim()}
                        {r.operacao ? ` (${String(r.operacao).trim()})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                placeholder="Ex: 32000"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">Cliente</Label>
              <Input
                id="client_name"
                placeholder="Nome do cliente"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_value">Valor Total (R$)</Label>
              <Input
                id="total_value"
                type="number"
                step="0.01"
                placeholder="Ex: 5000.00"
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver_value">Valor do Motorista (R$)</Label>
              <Input
                id="driver_value"
                type="number"
                step="0.01"
                placeholder="Ex: 3500.00"
                value={formData.driver_value}
                onChange={(e) => setFormData({ ...formData, driver_value: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickup_date">Data de Coleta</Label>
              <Input
                id="pickup_date"
                type="datetime-local"
                value={formData.pickup_date}
                onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_date">Data de Entrega</Label>
              <Input
                id="delivery_date"
                type="datetime-local"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_window_start">Janela de Entrega - Início</Label>
              <Input
                id="delivery_window_start"
                type="datetime-local"
                value={formData.delivery_window_start}
                onChange={(e) => setFormData({ ...formData, delivery_window_start: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_window_end">Janela de Entrega - Fim</Label>
              <Input
                id="delivery_window_end"
                type="datetime-local"
                value={formData.delivery_window_end}
                onChange={(e) => setFormData({ ...formData, delivery_window_end: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Embarque
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
