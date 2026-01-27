import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  message_text: string;
  variables: string[];
  active: boolean;
}

export const MessageTemplatesConfig = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('template_type');

    if (error) {
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const formattedData = (data || []).map(template => ({
        ...template,
        variables: Array.isArray(template.variables) 
          ? template.variables 
          : typeof template.variables === 'string'
            ? JSON.parse(template.variables as string)
            : []
      }));
      setTemplates(formattedData);
    }
    setLoading(false);
  };

  const toggleTemplateStatus = async (templateId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('message_templates')
      .update({ active: !currentStatus })
      .eq('id', templateId);

    if (error) {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Template atualizado",
        description: "Status do template alterado com sucesso",
      });
      fetchTemplates();
    }
  };

  const deleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      toast({
        title: "Erro ao deletar template",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Template deletado",
        description: "Template removido com sucesso",
      });
      fetchTemplates();
    }
  };

  const saveTemplate = async (template: Partial<MessageTemplate>) => {
    if (!template.name || !template.template_type || !template.message_text) {
      toast({
        title: "Erro de validação",
        description: "Nome, tipo e texto são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (editingTemplate?.id) {
      const { error } = await supabase
        .from('message_templates')
        .update({
          name: template.name,
          description: template.description,
          template_type: template.template_type,
          message_text: template.message_text,
          variables: template.variables,
          active: template.active,
        })
        .eq('id', editingTemplate.id);

      if (error) {
        toast({
          title: "Erro ao atualizar template",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('message_templates')
        .insert([{
          name: template.name,
          description: template.description,
          template_type: template.template_type,
          message_text: template.message_text,
          variables: template.variables || [],
          active: template.active ?? true,
        }]);

      if (error) {
        toast({
          title: "Erro ao criar template",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Template salvo",
      description: "Mensagem atualizada com sucesso",
    });
    setIsEditDialogOpen(false);
    setEditingTemplate(null);
    fetchTemplates();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência",
    });
  };

  const getTemplateTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      offer: "Oferta de Frete",
      confirmation: "Confirmação",
      status_request: "Solicitação de Status",
      delivery_confirmation: "Confirmação de Entrega"
    };
    return types[type] || type;
  };

  const getTemplateTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      offer: "bg-primary text-primary-foreground",
      confirmation: "bg-success text-success-foreground",
      status_request: "bg-warning text-warning-foreground",
      delivery_confirmation: "bg-info text-info-foreground"
    };
    return colors[type] || "bg-muted";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Templates de Mensagens</h2>
          <p className="text-muted-foreground">
            Personalize as mensagens enviadas aos motoristas via WhatsApp
          </p>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary" onClick={() => setEditingTemplate(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template de Mensagem'}
              </DialogTitle>
            </DialogHeader>
            <TemplateEditForm 
              template={editingTemplate} 
              onSave={saveTemplate}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingTemplate(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Variáveis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTemplateTypeColor(template.template_type)}>
                        {getTemplateTypeLabel(template.template_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.slice(0, 3).map((variable, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                        {template.variables.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.variables.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={template.active}
                        onCheckedChange={() => toggleTemplateStatus(template.id, template.active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPreviewTemplate(template);
                            setIsPreviewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(template.message_text)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(template);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview da Mensagem</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {previewTemplate.message_text}
                  </pre>
                </CardContent>
              </Card>
              <div>
                <p className="text-sm font-medium mb-2">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.variables.map((variable, idx) => (
                    <Badge key={idx} variant="secondary">
                      {`{${variable}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TemplateEditForm = ({ 
  template, 
  onSave, 
  onCancel 
}: { 
  template: MessageTemplate | null; 
  onSave: (template: Partial<MessageTemplate>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    template_type: template?.template_type || 'offer',
    message_text: template?.message_text || '',
    variables: template?.variables?.join(', ') || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const variablesArray = formData.variables
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    onSave({
      name: formData.name,
      description: formData.description,
      template_type: formData.template_type,
      message_text: formData.message_text,
      variables: variablesArray,
      active: template?.active ?? true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Template</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="template_type">Tipo de Mensagem</Label>
        <select
          id="template_type"
          className="w-full border rounded-md p-2"
          value={formData.template_type}
          onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
        >
          <option value="offer">Oferta de Frete</option>
          <option value="confirmation">Confirmação</option>
          <option value="status_request">Solicitação de Status</option>
          <option value="delivery_confirmation">Confirmação de Entrega</option>
        </select>
      </div>

      <div>
        <Label htmlFor="message_text">Texto da Mensagem</Label>
        <Textarea
          id="message_text"
          value={formData.message_text}
          onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
          rows={12}
          placeholder="Digite a mensagem aqui. Use {variavel} para incluir dados dinâmicos."
          className="font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use chaves para variáveis, ex: {"{nome_motorista}"}, {"{valor_frete}"}
        </p>
      </div>

      <div>
        <Label htmlFor="variables">Variáveis (separadas por vírgula)</Label>
        <Input
          id="variables"
          value={formData.variables}
          onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
          placeholder="nome_motorista, valor_frete, cidade_origem"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Liste as variáveis que podem ser usadas neste template
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-gradient-primary">
          Salvar Template
        </Button>
      </div>
    </form>
  );
};
