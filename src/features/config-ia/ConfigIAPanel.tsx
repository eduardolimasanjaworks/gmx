import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bot, Plus, Trash2, Route, Phone, Tags, Pencil } from 'lucide-react';
import { useConfigRotas, type ConfigRota } from '@/hooks/useConfigRotas';
import { useTiposOperacao } from '@/hooks/useTiposOperacao';
import { useTelefonesNotificacao } from '@/hooks/useTelefonesNotificacao';

export function ConfigIAPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-7 w-7 text-primary" />
          Configuração IA
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Rotas de negociação (piso/teto), tipos de operação e telefones que recebem alerta quando a
          IA esgota a negociação.
        </p>
      </div>

      <Tabs defaultValue="rotas">
        <TabsList>
          <TabsTrigger value="rotas" className="gap-2">
            <Route className="h-4 w-4" /> Rotas
          </TabsTrigger>
          <TabsTrigger value="operacoes" className="gap-2">
            <Tags className="h-4 w-4" /> Operações
          </TabsTrigger>
          <TabsTrigger value="telefones" className="gap-2">
            <Phone className="h-4 w-4" /> Notificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rotas" className="mt-4">
          <RotasSection />
        </TabsContent>
        <TabsContent value="operacoes" className="mt-4">
          <OperacoesSection />
        </TabsContent>
        <TabsContent value="telefones" className="mt-4">
          <TelefonesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RotasSection() {
  const { rotas, isLoading, createRota, updateRota, deleteRota } = useConfigRotas();
  const { tipos } = useTiposOperacao();
  const { telefones } = useTelefonesNotificacao();
  const [form, setForm] = useState({
    origem: '',
    destino: '',
    operacao: '',
    valor_minimo: '',
    valor_maximo: '',
  });
  const [editando, setEditando] = useState<ConfigRota | null>(null);
  const [editForm, setEditForm] = useState({
    origem: '',
    destino: '',
    operacao: '',
    valor_minimo: '',
    valor_maximo: '',
    ativo: true,
  });

  const abrirEdicao = (r: ConfigRota) => {
    setEditando(r);
    setEditForm({
      origem: r.origem,
      destino: r.destino,
      operacao: r.operacao || '',
      valor_minimo: String(r.valor_minimo),
      valor_maximo: String(r.valor_maximo),
      ativo: r.ativo !== false,
    });
  };

  const salvarEdicao = async () => {
    if (!editando) return;
    await updateRota(editando.id, {
      origem: editForm.origem,
      destino: editForm.destino,
      operacao: editForm.operacao || undefined,
      valor_minimo: parseFloat(editForm.valor_minimo),
      valor_maximo: parseFloat(editForm.valor_maximo),
      ativo: editForm.ativo,
    });
    setEditando(null);
  };

  const handleAdd = async () => {
    if (!form.origem || !form.destino || !form.valor_minimo || !form.valor_maximo) return;
    await createRota({
      origem: form.origem,
      destino: form.destino,
      operacao: form.operacao,
      valor_minimo: parseFloat(form.valor_minimo),
      valor_maximo: parseFloat(form.valor_maximo),
      ativo: true,
    });
    setForm({ origem: '', destino: '', operacao: '', valor_minimo: '', valor_maximo: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rotas — negociação IA</CardTitle>
        <CardDescription>
          Origem, destino, operação, valor mínimo e máximo. A IA usa esta tabela na negociação.
          Se o motorista insistir fora da faixa, a IA escalona para os telefones da aba
          Notificações ({telefones.filter((t) => t.ativo !== false).length} ativos).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <Label>Origem</Label>
            <Input
              value={form.origem}
              onChange={(e) => setForm({ ...form, origem: e.target.value })}
              placeholder="Guarulhos SP"
            />
          </div>
          <div>
            <Label>Destino</Label>
            <Input
              value={form.destino}
              onChange={(e) => setForm({ ...form, destino: e.target.value })}
              placeholder="Curitiba PR"
            />
          </div>
          <div>
            <Label>Operação</Label>
            <Select value={form.operacao} onValueChange={(v) => setForm({ ...form, operacao: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.nome}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mínimo (R$)</Label>
            <Input
              type="number"
              value={form.valor_minimo}
              onChange={(e) => setForm({ ...form, valor_minimo: e.target.value })}
            />
          </div>
          <div>
            <Label>Máximo (R$)</Label>
            <Input
              type="number"
              value={form.valor_maximo}
              onChange={(e) => setForm({ ...form, valor_maximo: e.target.value })}
            />
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Mín</TableHead>
                <TableHead>Máx</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rotas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.origem}</TableCell>
                  <TableCell>{r.destino}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.operacao || '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    {Number(r.valor_minimo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    {Number(r.valor_maximo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRota(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar rota</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Origem</Label>
                <Input
                  value={editForm.origem}
                  onChange={(e) => setEditForm({ ...editForm, origem: e.target.value })}
                />
              </div>
              <div>
                <Label>Destino</Label>
                <Input
                  value={editForm.destino}
                  onChange={(e) => setEditForm({ ...editForm, destino: e.target.value })}
                />
              </div>
              <div>
                <Label>Operação</Label>
                <Input
                  value={editForm.operacao}
                  onChange={(e) => setEditForm({ ...editForm, operacao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Mínimo (R$)</Label>
                  <Input
                    type="number"
                    value={editForm.valor_minimo}
                    onChange={(e) => setEditForm({ ...editForm, valor_minimo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Máximo (R$)</Label>
                  <Input
                    type="number"
                    value={editForm.valor_maximo}
                    onChange={(e) => setEditForm({ ...editForm, valor_maximo: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.ativo}
                  onCheckedChange={(v) => setEditForm({ ...editForm, ativo: v })}
                />
                <Label>Rota ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button onClick={salvarEdicao}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function OperacoesSection() {
  const { tipos, createTipo, toggleTipo, deleteTipo } = useTiposOperacao();
  const [nome, setNome] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de operação</CardTitle>
        <CardDescription>Arroz, lata, ME, malte — adicione novos conforme necessário.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 max-w-md">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: SOJA"
          />
          <Button
            onClick={() => {
              if (nome.trim()) {
                createTipo(nome.trim());
                setNome('');
              }
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 border rounded-lg px-3 py-2"
            >
              <span className="font-medium text-sm">{t.nome}</span>
              <Switch
                checked={t.ativo !== false}
                onCheckedChange={(v) => toggleTipo(t.id, v)}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTipo(t.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TelefonesSection() {
  const { telefones, createTelefone, updateTelefone, deleteTelefone } = useTelefonesNotificacao();
  const [form, setForm] = useState({ nome: '', telefone: '' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telefones — escalonamento</CardTitle>
        <CardDescription>
          Quem recebe WhatsApp quando a IA esgota a negociação ou o motorista insiste em valor fora da
          faixa da rota (ferramenta escalonar_negociacao).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <Label>Nome</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Adriano ops"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="5511999999999"
            />
          </div>
          <Button
            onClick={() => {
              if (form.nome && form.telefone) {
                createTelefone({ ...form, ativo: true });
                setForm({ nome: '', telefone: '' });
              }
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {telefones.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.nome}</TableCell>
                <TableCell>{t.telefone}</TableCell>
                <TableCell>
                  <Switch
                    checked={t.ativo !== false}
                    onCheckedChange={(v) => updateTelefone(t.id, { ativo: v })}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteTelefone(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
