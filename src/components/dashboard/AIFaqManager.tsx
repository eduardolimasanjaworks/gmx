import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const categories = ["Financeiro", "Documentação", "Processo", "Localização", "Suporte"];

interface AiFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  active: boolean;
  usage_count: number;
}

export const AIFaqManager = () => {
  const [faqs, setFaqs] = useState<AiFaq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFaqs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('ai-faq-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_faq'
        },
        () => {
          fetchFaqs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_faq')
        .select('*')
        .order('category')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      toast({
        title: "Erro ao carregar FAQs",
        description: "Não foi possível carregar as perguntas frequentes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.question || !formData.answer || !formData.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('ai_faq')
          .update({
            question: formData.question,
            answer: formData.answer,
            category: formData.category,
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "FAQ atualizado",
          description: "Pergunta atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('ai_faq')
          .insert([{
            question: formData.question,
            answer: formData.answer,
            category: formData.category,
          }]);

        if (error) throw error;

        toast({
          title: "FAQ criado",
          description: "Nova pergunta adicionada com sucesso!",
        });
      }

      setFormData({ question: "", answer: "", category: "" });
      setEditingId(null);
      fetchFaqs();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a pergunta.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (faq: AiFaq) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
    });
    setEditingId(faq.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_faq')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "FAQ removido",
        description: "Pergunta removida com sucesso!",
      });
      fetchFaqs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a pergunta.",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_faq')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Pergunta ${!currentActive ? 'ativada' : 'desativada'} com sucesso!`,
      });
      fetchFaqs();
    } catch (error) {
      console.error('Error toggling FAQ status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFormData({ question: "", answer: "", category: "" });
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">FAQ da IA</h2>
          <p className="text-muted-foreground">
            Gerencie as respostas automáticas do assistente ({faqs.length})
          </p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>
            {editingId ? "Editar Resposta" : "Adicionar Nova Resposta"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Pergunta/Gatilho</Label>
            <Input
              id="question"
              placeholder="Ex: Quanto tempo demora o pagamento?"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Resposta</Label>
            <Textarea
              id="answer"
              placeholder="Digite a resposta que a IA deve dar..."
              rows={4}
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Use variáveis: {"{nome_motorista}"}, {"{valor_frete}"}, {"{data}"}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              {editingId && (
                <Button variant="outline" className="flex-1" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
              <Button className="flex-1 bg-gradient-success" onClick={handleSave}>
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {faqs.map((faq) => (
          <Card key={faq.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{faq.question}</CardTitle>
                  </div>
                  <Badge variant="outline">{faq.category}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(faq)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(faq.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {faq.answer}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                <span>Usada {faq.usage_count}x nos últimos 7 dias</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={faq.active}
                    onCheckedChange={() => toggleActive(faq.id, faq.active)}
                  />
                  <Badge className={faq.active ? "bg-success" : "bg-muted"}>
                    {faq.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};