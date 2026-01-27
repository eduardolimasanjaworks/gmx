import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Driver {
  id: string;
  name: string;
  cpf: string;
  phone?: string;
  email?: string;
  vehicle_type?: string;
  truck_plate?: string;
  trailer_plate_1?: string;
  trailer_plate_2?: string;
  trailer_plate_3?: string;
  current_location?: string;
  city?: string;
  state?: string;
  status: string;
  availability_status: string;
  last_freight_date?: string;
  last_update?: string;
  metadata?: any;
}

interface DriverCrudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver;
  onSuccess: () => void;
}

export const DriverCrudDialog = ({ open, onOpenChange, driver, onSuccess }: DriverCrudDialogProps) => {
  const [formData, setFormData] = useState<Partial<Driver>>({
    name: "",
    cpf: "",
    phone: "",
    email: "",
    vehicle_type: "",
    truck_plate: "",
    trailer_plate_1: "",
    trailer_plate_2: "",
    trailer_plate_3: "",
    current_location: "",
    city: "",
    state: "",
    status: "active",
    availability_status: "available",
  });

  useEffect(() => {
    if (driver) {
      setFormData(driver);
    } else {
      setFormData({
        name: "",
        cpf: "",
        phone: "",
        email: "",
        vehicle_type: "",
        truck_plate: "",
        trailer_plate_1: "",
        trailer_plate_2: "",
        trailer_plate_3: "",
        current_location: "",
        city: "",
        state: "",
        status: "active",
        availability_status: "available",
      });
    }
  }, [driver, open]);

  const handleSave = async () => {
    if (!formData.name) {
      toast({ variant: "destructive", title: "Nome é obrigatório" });
      return;
    }

    try {
      const now = new Date().toISOString();
      const dataToSave = { 
        name: formData.name,
        cpf: formData.cpf,
        phone: formData.phone,
        email: formData.email,
        vehicle_type: formData.vehicle_type,
        truck_plate: formData.truck_plate,
        trailer_plate_1: formData.trailer_plate_1,
        trailer_plate_2: formData.trailer_plate_2,
        trailer_plate_3: formData.trailer_plate_3,
        current_location: formData.current_location,
        city: formData.city,
        state: formData.state,
        status: formData.status,
        availability_status: formData.availability_status,
        last_freight_date: formData.last_freight_date,
        last_update: now 
      };

      if (driver) {
        const { error } = await supabase.from("drivers").update(dataToSave).eq("id", driver.id);
        if (error) throw error;
        toast({ title: "Motorista atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("drivers").insert([dataToSave]);
        if (error) throw error;
        toast({ title: "Motorista criado com sucesso" });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{driver ? "Editar Motorista" : "Novo Motorista"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" />
          </div>

          <div>
            <Label>CPF</Label>
            <Input value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" type="email" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Veículo</Label>
              <Input value={formData.vehicle_type} onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })} placeholder="Ex: Truck, Carreta" />
            </div>
            <div>
              <Label>Placa Cavalo</Label>
              <Input value={formData.truck_plate} onChange={(e) => setFormData({ ...formData, truck_plate: e.target.value })} placeholder="ABC-1234" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Carreta 1</Label>
              <Input value={formData.trailer_plate_1} onChange={(e) => setFormData({ ...formData, trailer_plate_1: e.target.value })} placeholder="ABC-1234" />
            </div>
            <div>
              <Label>Carreta 2</Label>
              <Input value={formData.trailer_plate_2} onChange={(e) => setFormData({ ...formData, trailer_plate_2: e.target.value })} placeholder="ABC-1234" />
            </div>
            <div>
              <Label>Carreta 3</Label>
              <Input value={formData.trailer_plate_3} onChange={(e) => setFormData({ ...formData, trailer_plate_3: e.target.value })} placeholder="ABC-1234" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Localização</Label>
              <Input value={formData.current_location} onChange={(e) => setFormData({ ...formData, current_location: e.target.value })} placeholder="Localização" />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Cidade" />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="UF" maxLength={2} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Disponibilidade</Label>
              <Select value={formData.availability_status} onValueChange={(value) => setFormData({ ...formData, availability_status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível, vázio</SelectItem>
                  <SelectItem value="busy">Em Viagem</SelectItem>
                  <SelectItem value="waiting_advance">Aguardando adiantamento</SelectItem>
                  <SelectItem value="waiting_unload">Esperando para descarregar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
