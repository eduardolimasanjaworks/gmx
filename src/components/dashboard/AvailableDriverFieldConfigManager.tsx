import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";
import { useAvailableDriverFields } from "@/hooks/useAvailableDriverFields";

export const AvailableDriverFieldConfigManager = () => {
    const { toast } = useToast();
    const { allFields, isLoading, refetch, saveConfig } = useAvailableDriverFields();
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
            saveConfig(localConfig);

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
        return <div className="p-4 text-center">Carregando configurações...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configuração de Campos Visíveis
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Configure quais campos aparecem nos cards e na tabela
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {localConfig.map(field => (
                    <Card key={field.id} className="shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-semibold">{field.display_name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`${field.id}-card`} className="text-sm cursor-pointer">
                                    Visível no Card
                                </Label>
                                <Switch
                                    id={`${field.id}-card`}
                                    checked={field.visible_in_card}
                                    onCheckedChange={() => handleToggle(field.id, "card")}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`${field.id}-table`} className="text-sm cursor-pointer">
                                    Visível na Tabela
                                </Label>
                                <Switch
                                    id={`${field.id}-table`}
                                    checked={field.visible_in_table}
                                    onCheckedChange={() => handleToggle(field.id, "table")}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? (
                    "Salvando..."
                ) : (
                    <>
                        <Save className="h-4 w-4 mr-2" /> Salvar Configurações
                    </>
                )}
            </Button>
        </div>
    );
};
