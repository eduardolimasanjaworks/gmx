import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Save } from "lucide-react";
import { useDriverFields } from "@/hooks/useDriverFields";

export const FieldConfigManager = () => {
  const { toast } = useToast();
  const { allFields, isLoading, refetch } = useDriverFields();
  const [localConfig, setLocalConfig] = useState(allFields);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalConfig(allFields);
  }, [allFields]);

  const handleToggle = (fieldId: string, type: "card" | "table") => {
    setLocalConfig(prev =>
      prev.map(field =>
        field.id === fieldId
          ? {
              ...field,
              [type === "card" ? "visible_in_card" : "visible_in_table"]:
                !(type === "card" ? field.visible_in_card : field.visible_in_table)
            }
          : field
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = localConfig.map(field => ({
        id: field.id,
        visible_in_card: field.visible_in_card,
        visible_in_table: field.visible_in_table
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("driver_field_config")
          .update({
            visible_in_card: update.visible_in_card,
            visible_in_table: update.visible_in_table
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Configuração salva",
        description: "As preferências de visualização foram atualizadas."
      });

      refetch();
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Carregando configurações...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <div>
            <CardTitle>Configuração de Campos Visíveis</CardTitle>
            <CardDescription>
              Configure quais campos aparecem nos cards e na tabela
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {localConfig.map(field => (
            <div
              key={field.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{field.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  Campo: {field.field_name} • Tipo: {field.field_type}
                </p>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${field.id}-card`}
                    checked={field.visible_in_card}
                    onCheckedChange={() => handleToggle(field.id, "card")}
                  />
                  <Label htmlFor={`${field.id}-card`} className="text-sm">
                    Card
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${field.id}-table`}
                    checked={field.visible_in_table}
                    onCheckedChange={() => handleToggle(field.id, "table")}
                  />
                  <Label htmlFor={`${field.id}-table`} className="text-sm">
                    Tabela
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
};
