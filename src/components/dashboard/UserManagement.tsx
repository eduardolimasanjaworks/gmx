import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, User, Save, X, Settings } from "lucide-react";
import { useUsers, type Permission } from "@/hooks/useUsers";
import { useRoles, type AppRole } from "@/hooks/useRoles";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const permissionsList: { id: Permission; label: string }[] = [
  { id: "cadastros", label: "Cadastros" },
  { id: "disponiveis", label: "Disponíveis" },
  { id: "embarques", label: "Embarques" },
  { id: "historico", label: "Histórico" },
  { id: "dashboard", label: "Dashboard" },
  { id: "faq", label: "FAQ IA" },
  { id: "usuarios", label: "Usuários" },
];

export const UserManagement = () => {
  const { users, isLoading, createUser, updateUser, deleteUser, refetch: refetchUsers } = useUsers();
  const { roles, isLoading: rolesLoading, createRole, deleteRole, updateRole } = useRoles();

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({}); // Changed to string[] to match generic role perms
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const usersPerPage = 6;

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "" // Initial empty
  });

  const [newRoleData, setNewRoleData] = useState({
    name: "",
    description: "",
    permissions: [] as string[]
  });

  // Effect to select first role as default if available and not set
  useEffect(() => {
    if (roles.length > 0 && !formData.role) {
      setFormData(prev => ({ ...prev, role: roles[0].name }));
    }
  }, [roles, formData.role]);

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const getPermissionsForRoleName = (roleName: string): string[] => {
    const role = roles.find(r => r.name === roleName);
    return role ? role.permissions : [];
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // If role changed, we might want to reset manual permission overrides or keep them?
    // Current logic: the checkboxes rely on `selectedPermissions["new"]` or fall back to role perms.
    // If user changes role, we should probably clear manual overrides to show new role defaults.
    if (field === 'role') {
      setSelectedPermissions(prev => {
        const copy = { ...prev };
        delete copy["new"];
        return copy;
      });
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const defaultPerms = getPermissionsForRoleName(formData.role);
      const userPermissions = selectedPermissions["new"] || defaultPerms;

      if (!userPermissions || userPermissions.length === 0) {
        // Usar um toast aqui seria ideal, mas um alert serve para validação rápida se não tiver hook de toast em escopo fácil
        alert("Erro: O usuário deve ter pelo menos uma permissão válida.");
        return;
      }

      setIsCreating(true);
      await createUser(formData.email, formData.password, formData.displayName, formData.role, userPermissions as Permission[]);
      setFormData({ displayName: "", email: "", password: "", role: roles[0]?.name || "" });
      setSelectedPermissions({});
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const userPermissions = selectedPermissions[userId];
      // Note: We are currently just saving the role name (legacy logic in useUsers), 
      // but ideally we should save the role_id directly or handle "personalizado" better.
      // For now, if permissions match a known role, we use that role.

      let matchedRoleName = "personalizado";
      for (const role of roles) {
        if (JSON.stringify(userPermissions?.sort()) === JSON.stringify(role.permissions.sort())) {
          matchedRoleName = role.name;
          break;
        }
      }

      await updateUser(userId, undefined, matchedRoleName, userPermissions as Permission[]);
      setEditingUser(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const togglePermission = (userId: string, permission: string) => {
    setSelectedPermissions(prev => {
      const current = prev[userId] || (userId === "new" ? getPermissionsForRoleName(formData.role) : users.find(u => u.id === userId)?.permissions || []);
      const hasPermission = current.includes(permission);

      return {
        ...prev,
        [userId]: hasPermission
          ? current.filter(p => p !== permission)
          : [...current, permission]
      };
    });
  };

  const startEditing = (userId: string, userPermissions: Permission[]) => {
    setEditingUser(userId);
    setSelectedPermissions(prev => ({
      ...prev,
      [userId]: userPermissions
    }));
  };

  const handleCreateRole = async () => {
    if (!newRoleData.name) return;
    await createRole(newRoleData);
    setNewRoleData({ name: "", description: "", permissions: [] });
    setRoleDialogOpen(false);
  };

  if (isLoading || rolesLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando gerenciamento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Usuários e Permissões
          </h2>
          <p className="text-muted-foreground">
            Gerencie o acesso ao sistema e defina os cargos.
          </p>
        </div>
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Gerenciar Cargos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Gerenciar Cargos e Funções</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list">Cargos Existentes</TabsTrigger>
                <TabsTrigger value="create">Criar Novo</TabsTrigger>
              </TabsList>
              <TabsContent value="list" className="space-y-4">
                <div className="grid gap-4">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-semibold text-lg flex items-center gap-2">
                          {role.name}
                          <Badge variant="secondary" className="text-xs">{role.permissions.length} perms</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{role.description || "Sem descrição"}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteRole(role.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="create" className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label>Nome do Cargo</Label>
                    <Input
                      value={newRoleData.name}
                      onChange={e => setNewRoleData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Operador Logístico"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={newRoleData.description}
                      onChange={e => setNewRoleData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição breve da função"
                    />
                  </div>
                  <div>
                    <Label>Permissões</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {permissionsList.map(perm => (
                        <div key={perm.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`role-new-${perm.id}`}
                            checked={newRoleData.permissions.includes(perm.id)}
                            onCheckedChange={(checked) => {
                              setNewRoleData(prev => ({
                                ...prev,
                                permissions: checked
                                  ? [...prev.permissions, perm.id]
                                  : prev.permissions.filter(p => p !== perm.id)
                              }));
                            }}
                          />
                          <Label htmlFor={`role-new-${perm.id}`}>{perm.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateRole} className="w-full">Salvar Cargo</Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>


      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Cadastrar Novo Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => handleFormChange("displayName", e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="email@gmx.com.br"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleFormChange("password", e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Cargo / Função (Opcional)</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleFormChange("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo (ou 'Sem Cargo')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem Cargo (Personalizado)</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Permissões</Label>
                {/* Visual Indicator of Role Status */}
                {formData.role && formData.role !== 'none' && (
                  <Badge variant={
                    JSON.stringify((selectedPermissions["new"] || getPermissionsForRoleName(formData.role)).sort()) === JSON.stringify(getPermissionsForRoleName(formData.role).sort())
                      ? "outline"
                      : "secondary"
                  } className="text-xs">
                    {JSON.stringify((selectedPermissions["new"] || getPermissionsForRoleName(formData.role)).sort()) === JSON.stringify(getPermissionsForRoleName(formData.role).sort())
                      ? `Padrão: ${formData.role}`
                      : "Personalizado (Divergente do Cargo)"}
                  </Badge>
                )}
              </div>

              <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 p-4 rounded-md ${formData.role && formData.role !== 'none' && JSON.stringify((selectedPermissions["new"] || getPermissionsForRoleName(formData.role)).sort()) !== JSON.stringify(getPermissionsForRoleName(formData.role).sort()) ? "border border-amber-500/50" : ""}`}>
                {permissionsList.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`new-${permission.id}`}
                      // Check logic: If "new" overrides exist, use them. Else if role exists, use role defaults. Else empty.
                      checked={
                        selectedPermissions["new"]
                          ? selectedPermissions["new"].includes(permission.id)
                          : (formData.role && formData.role !== 'none' ? getPermissionsForRoleName(formData.role).includes(permission.id) : false)
                      }
                      onCheckedChange={() => togglePermission("new", permission.id)}
                    />
                    <label
                      htmlFor={`new-${permission.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {permission.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? "Criando..." : "Criar Usuário"}
            </Button>
          </form>
        </CardContent>
      </Card>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentUsers.map((user) => (
          <Card key={user.id} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{user.display_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {editingUser === user.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveUser(user.id)}
                      >
                        <Save className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(user.id, user.permissions)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(user.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">
                {user.role}
              </Badge>

              {editingUser === user.id && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-semibold">Editar Permissões (Personalizado):</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {permissionsList.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${user.id}-${permission.id}`}
                          checked={selectedPermissions[user.id]?.includes(permission.id)}
                          onCheckedChange={() => togglePermission(user.id, permission.id)}
                        />
                        <label
                          htmlFor={`${user.id}-${permission.id}`}
                          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {permission.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editingUser !== user.id && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold mb-1">Permissões:</p>
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.length > 0 ? (
                      user.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {permissionsList.find(p => p.id === perm)?.label || perm}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhuma permissão</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4 text-sm">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};
