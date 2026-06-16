import { useState } from 'react';
import { Plus, Settings2, Pencil, Trash2, Save, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTipoCarroceriaOptions } from '@/hooks/useTipoCarroceriaOptions';
import { useToast } from '@/hooks/use-toast';

const CREATE_VALUE = '__create_carroceria__';

interface TipoCarroceriaSelectProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TipoCarroceriaSelect({ value, onChange, className }: TipoCarroceriaSelectProps) {
  const { toast } = useToast();
  const { defaultOptions, customOptions, allOptions, addOption, updateOption, removeOption } =
    useTipoCarroceriaOptions(value ? [value] : []);

  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleSelect = (selected: string) => {
    if (selected === CREATE_VALUE) {
      setNewName('');
      setCreateOpen(true);
      return;
    }
    onChange(selected);
  };

  const handleCreate = () => {
    const result = addOption(newName);
    if (!result.ok) {
      toast({ variant: 'destructive', title: 'Não foi possível criar', description: result.error });
      return;
    }
    onChange(result.value);
    setCreateOpen(false);
    setNewName('');
    toast({ title: 'Tipo criado', description: `"${result.value}" adicionado à lista.` });
  };

  const handleStartEdit = (name: string) => {
    setEditingName(name);
    setEditingValue(name);
  };

  const handleSaveEdit = () => {
    if (!editingName) return;
    const result = updateOption(editingName, editingValue);
    if (!result.ok) {
      toast({ variant: 'destructive', title: 'Não foi possível editar', description: result.error });
      return;
    }
    if (value === editingName) onChange(result.value);
    setEditingName(null);
    setEditingValue('');
    toast({ title: 'Tipo atualizado' });
  };

  const handleDelete = (name: string) => {
    if (!window.confirm(`Remover o tipo "${name}" da lista?`)) return;
    removeOption(name);
    if (value === name) onChange('');
    toast({ title: 'Tipo removido' });
  };

  return (
    <>
      <div className={`flex items-center gap-1 max-w-[55%] ml-auto ${className || ''}`}>
        <Select value={value || ''} onValueChange={handleSelect}>
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            {defaultOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
            {customOptions.length > 0 && <SelectSeparator />}
            {customOptions.map((opt) => (
              <SelectItem key={`custom-${opt}`} value={opt}>{opt}</SelectItem>
            ))}
            {value && !allOptions.includes(value) && (
              <SelectItem value={value}>{value}</SelectItem>
            )}
            <SelectSeparator />
            <SelectItem value={CREATE_VALUE} className="text-primary font-medium">
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" />
                Criar outro...
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Gerenciar tipos personalizados"
          onClick={() => setManageOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar tipo de carroceria</DialogTitle>
            <DialogDescription>
              Adicione um novo tipo à lista. Ele ficará disponível para todos os cadastros neste navegador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="novo-tipo-carroceria">Nome do tipo</Label>
            <Input
              id="novo-tipo-carroceria"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Plataforma"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar e selecionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tipos de carroceria personalizados</DialogTitle>
            <DialogDescription>
              Os tipos padrão não podem ser editados. Aqui você gerencia apenas os criados por você.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {customOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum tipo personalizado ainda. Use &quot;Criar outro...&quot; no seletor.
              </p>
            ) : (
              customOptions.map((name) => (
                <div key={name} className="flex items-center gap-2 border rounded-md p-2">
                  {editingName === name ? (
                    <>
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="h-8"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => { setEditingName(null); setEditingValue(''); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium truncate">{name}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(name)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="sm:mr-auto"
              onClick={() => {
                setManageOpen(false);
                setNewName('');
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar outro
            </Button>
            <Button onClick={() => setManageOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
