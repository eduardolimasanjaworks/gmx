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
import { useCnhValidadeStatusOptions } from '@/hooks/useCnhValidadeStatusOptions';
import { useToast } from '@/hooks/use-toast';
import { getCnhValidadeStatusBadgeColor } from '@/components/driver/driver-status-constants';
import { Badge } from '@/components/ui/badge';

const CREATE_VALUE = '__create_cnh_status__';
const EMPTY_VALUE = '_empty_';

interface CnhValidadeStatusSelectProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CnhValidadeStatusSelect({ value, onChange, className }: CnhValidadeStatusSelectProps) {
  const { toast } = useToast();
  const { defaultOptions, customOptions, allOptions, addOption, updateOption, removeOption } =
    useCnhValidadeStatusOptions(value ? [value] : []);

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
    onChange(selected === EMPTY_VALUE ? '' : selected);
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
    toast({ title: 'Status criado', description: `"${result.value}" adicionado.` });
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
    toast({ title: 'Status atualizado' });
  };

  const handleDelete = (name: string) => {
    if (!window.confirm(`Remover o status "${name}"?`)) return;
    removeOption(name);
    if (value === name) onChange('');
    toast({ title: 'Status removido' });
  };

  return (
    <>
      <div className={`flex items-center gap-1 max-w-[55%] ml-auto ${className || ''}`}>
        <Select value={value || EMPTY_VALUE} onValueChange={handleSelect}>
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue placeholder="Selecione">
              {value ? (
                <Badge className={`${getCnhValidadeStatusBadgeColor(value)} text-[10px] px-2 h-5 border-transparent`}>
                  {value}
                </Badge>
              ) : (
                '(vazio)'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            <SelectItem value={EMPTY_VALUE}>(vazio)</SelectItem>
            <SelectSeparator />
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
          title="Gerenciar status personalizados"
          onClick={() => setManageOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar status de validade CNH</DialogTitle>
            <DialogDescription>Ex.: CNH NO PRAZO, CNH EXPIRADA, CNH A VENCER.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="novo-status-cnh">Nome do status</Label>
            <Input
              id="novo-status-cnh"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: CNH EM ANÁLISE"
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
            <DialogTitle>Status de validade CNH personalizados</DialogTitle>
            <DialogDescription>Os status padrão não podem ser editados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {customOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum status personalizado ainda.
              </p>
            ) : (
              customOptions.map((name) => (
                <div key={name} className="flex items-center gap-2 border rounded-md p-2">
                  {editingName === name ? (
                    <>
                      <Input value={editingValue} onChange={(e) => setEditingValue(e.target.value)} className="h-8" />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}><Save className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingName(null); setEditingValue(''); }}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <Badge className={`${getCnhValidadeStatusBadgeColor(name)} border-transparent`}>{name}</Badge>
                      <span className="flex-1" />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingName(name); setEditingValue(name); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(name)}><Trash2 className="h-4 w-4" /></Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="sm:mr-auto" onClick={() => { setManageOpen(false); setCreateOpen(true); }}>
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
