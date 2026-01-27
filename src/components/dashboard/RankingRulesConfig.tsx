import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Info, Sliders } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RankingRule {
  id: string;
  rule_type: string;
  name: string;
  description: string | null;
  weight: number;
  enabled: boolean;
  parameters: any;
}

export const RankingRulesConfig = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<RankingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from("ranking_rules")
        .select("*")
        .order("weight", { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error("Error fetching rules:", error);
      toast({
        title: "Erro ao carregar regras",
        description: "Não foi possível carregar as regras de rankeamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const handleWeightChange = (ruleId: string, value: number[]) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, weight: value[0] } : rule))
    );
  };

  const handleParameterChange = (ruleId: string, paramKey: string, value: any) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              parameters: {
                ...rule.parameters,
                [paramKey]: value,
              },
            }
          : rule
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const rule of rules) {
        const { error } = await supabase
          .from("ranking_rules")
          .update({
            weight: rule.weight,
            enabled: rule.enabled,
            parameters: rule.parameters,
          })
          .eq("id", rule.id);

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas",
        description: "As regras de rankeamento foram atualizadas com sucesso.",
      });

      fetchRules();
    } catch (error) {
      console.error("Error saving rules:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Carregando regras...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure os pesos e parâmetros das regras fixas de rankeamento. Cada regra contribui
          para a pontuação final dos motoristas.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 md:grid-cols-2">
        {rules.map((rule) => (
          <Card key={rule.id} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{rule.name}</CardTitle>
                  <CardDescription className="text-xs">{rule.description}</CardDescription>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => handleToggleRule(rule.id)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Peso</Label>
                  <span className="text-xs font-medium">{rule.weight}</span>
                </div>
                <Slider
                  value={[rule.weight]}
                  onValueChange={(value) => handleWeightChange(rule.id, value)}
                  max={10}
                  min={0}
                  step={1}
                  disabled={!rule.enabled}
                  className="h-1"
                />
              </div>

              {Object.keys(rule.parameters).length > 0 && (
                <div className="grid gap-2 pt-2 border-t">
                  <p className="text-xs font-medium">Parâmetros</p>
                  {Object.entries(rule.parameters).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-2 items-center">
                      <Label htmlFor={`${rule.id}-${key}`} className="text-xs">
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Label>
                      <Input
                        id={`${rule.id}-${key}`}
                        type="number"
                        value={String(value)}
                        onChange={(e) =>
                          handleParameterChange(rule.id, key, parseFloat(e.target.value) || 0)
                        }
                        disabled={!rule.enabled}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};
