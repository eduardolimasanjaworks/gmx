import { useState, useEffect } from "react";
import { directus } from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItem, createUser as createSystemUser, updateUser as updateSystemUser, deleteUser as deleteSystemUser, readRoles, readUsers } from "@directus/sdk";
import { useToast } from "@/hooks/use-toast";

export type Permission =
  | "cadastros"
  | "disponiveis"
  | "embarques"
  | "historico"
  | "dashboard"
  | "faq"
  | "usuarios"
  | "gestao_equipe";

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  permissions: Permission[];
  created_at: string;
  role_id?: any; // To store full role object
}

const normalizePermissions = (value: unknown): Permission[] => {
  return Array.isArray(value) ? value.filter((item): item is Permission => typeof item === "string") : [];
};

const normalizeRoleName = (role: any) => role?.name || role?.nome || "personalizado";

const buildAppUserPayload = (displayName?: string, permissions?: Permission[]) => {
  const payload: Record<string, unknown> = {};

  if (displayName !== undefined) {
    payload.display_name = displayName;
    payload.nome = displayName;
  }

  payload.active = true;
  payload.ativo = true;

  if (permissions !== undefined) {
    payload.permissions = permissions;
  }

  return payload;
};

const normalizeAppUser = (u: any): User => {
  let userPerms: Permission[] = [];
  if (u.permissions && Array.isArray(u.permissions) && u.permissions.length > 0) {
    userPerms = normalizePermissions(u.permissions);
  } else if (u.role_id?.permissions) {
    userPerms = normalizePermissions(u.role_id.permissions);
  }

  return {
    id: String(u.id),
    email: u.email,
    display_name: u.display_name || u.nome || u.email || "Sem nome",
    role: normalizeRoleName(u.role_id),
    permissions: userPerms,
    created_at: u.date_created,
    role_id: u.role_id
  };
};

const roleNameFilter = (roleName: string) => ({
  _or: [
    { name: { _eq: roleName } },
    { nome: { _eq: roleName } }
  ]
});


export const useUsers = () => {
  const isCustomRole = (roleName?: string | null) =>
    !roleName || roleName === 'none' || roleName === 'personalizado';

  // ... (state permanecem iguais)
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // ... (fetchUsers permanece igual)
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await directus.request(readItems('app_users', {
        fields: ['*', 'role_id.*'],
        sort: ['-id' as any]
      }));

      const mappedUsers = data.map((u: any) => normalizeAppUser(u));

      setUsers(mappedUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUser = async (userId: string, displayName?: string, roleName?: string, permissions?: Permission[], email?: string) => {
    try {
      const updateData: any = {};
      if (displayName) updateData.display_name = displayName;
      if (email) updateData.email = email;

      if (roleName !== undefined) {
        if (!isCustomRole(roleName)) {
          const roles = await directus.request(readItems('app_roles', {
            filter: roleNameFilter(roleName)
          }));
          if (roles.length > 0) {
            updateData.role_id = roles[0].id;
            updateData.permissions = null; // Reset perms if assigning a standard role
          }
        } else {
          updateData.role_id = null; // Detach role
          updateData.permissions = permissions ?? [];
        }
      } else {
        // If only updating permissions (without changing role mode explicitly, or if already personalized)
        if (permissions) {
          updateData.permissions = permissions;
        }
      }

      // Check if email changed to update the System User as well
      const targetUser = users.find(u => u.id === userId);
      if (email && targetUser && targetUser.email !== email) {
        const systemUsers = await directus.request(readUsers({
          filter: { email: { _eq: targetUser.email } },
          fields: ['id']
        }));
        
        if (systemUsers && systemUsers.length > 0) {
           await directus.request(updateSystemUser(systemUsers[0].id, { email }));
        }
      }

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "Nada para atualizar",
          description: "Nenhuma alteração detectada."
        });
        return;
      }
      try {
        await directus.request(updateItem('app_users', userId, updateData));
      } catch (primaryError) {
        const legacyCompatibleData = {
          ...updateData,
          ...(displayName !== undefined ? { nome: displayName } : {}),
          active: undefined,
          display_name: undefined,
          ativo: true,
        };

        Object.keys(legacyCompatibleData).forEach((key) => {
          if (legacyCompatibleData[key] === undefined) {
            delete legacyCompatibleData[key];
          }
        });

        await directus.request(updateItem('app_users', userId, legacyCompatibleData));
      }

      toast({
        title: "Usuário atualizado",
        description: "Alterações salvas"
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const createUser = async (email: string, password: string, displayName: string, roleName: string, permissions: Permission[]) => {
    try {
      // 1. Resolver ID do Cargo (App Role) e Permissões
      let roleId = null;
      let finalPermissions = null;

      if (!isCustomRole(roleName)) {
        const roles = await directus.request(readItems('app_roles', {
          filter: roleNameFilter(roleName)
        }));
        if (roles && roles.length > 0) {
          roleId = roles[0].id;
          // If using a role, we don't save DB permissions typically, UNLESS we want overrides. 
          // For now, let's keep it simple: Role = Role Perms. Custom = Custom Perms.
        } else {
          console.warn(`Role ${roleName} not found via name search.`);
        }
      } else {
        // Personalized mode
        finalPermissions = permissions ?? [];
      }

      console.log(`Creating user with Role ID: ${roleId} (Name: ${roleName}), Perms:`, finalPermissions);

      // 2. Criar Usuário de Autenticação (System User)
      const KNOWN_ADMIN_ROLE_ID = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';

      const systemUserPayload = {
        email,
        password,
        first_name: displayName.split(' ')[0],
        last_name: displayName.split(' ').slice(1).join(' '),
        role: KNOWN_ADMIN_ROLE_ID,
        status: 'active'
      };

      await directus.request(createSystemUser(systemUserPayload));

      // 3. Criar Perfil da Aplicação (App User)
      const appUserPayload: any = {
        email,
        role_id: roleId,
        ...buildAppUserPayload(displayName),
      };

      if (finalPermissions && finalPermissions.length > 0) {
        appUserPayload.permissions = finalPermissions;
      }

      try {
        await directus.request(createItem('app_users', appUserPayload));
      } catch (primaryError) {
        const legacyPayload: any = {
          email,
          role_id: roleId,
          nome: displayName,
          ativo: true,
        };

        if (finalPermissions && finalPermissions.length > 0) {
          legacyPayload.permissions = finalPermissions;
        }

        await directus.request(createItem('app_users', legacyPayload));
      }

      toast({
        title: "Usuário criado com sucesso",
        description: `Login: ${email}`
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Create user error:", error);
      let msg = error.message;
      if (error?.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
        msg = "Este e-mail já está em uso.";
      }
      toast({
        title: "Erro ao criar",
        description: msg,
        variant: "destructive"
      });
      throw error;
    }
  };

  // ... updateUser remains similar

  const updateUserPassword = async (userId: string, newPassword: string) => {
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('A senha deve ter no mínimo 6 caracteres.');
      }

      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser?.email) {
        throw new Error('Usuário não encontrado.');
      }

      const systemUsers = await directus.request(
        readUsers({
          filter: { email: { _eq: targetUser.email } },
          fields: ['id'],
        }),
      );

      if (!systemUsers?.length) {
        throw new Error('Usuário de autenticação (Directus) não encontrado para este e-mail.');
      }

      await directus.request(
        updateSystemUser(systemUsers[0].id, { password: newPassword }),
      );

      toast({
        title: 'Senha atualizada',
        description: `Nova senha definida para ${targetUser.email}`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // 1. Get the app user to find their email
      const appUser = users.find(u => u.id === userId); // users state usually has string id here

      // We need to fetch the item to be sure if not in state or if state is stale
      const targetUser = await directus.request(readItems('app_users', {
        filter: { id: { _eq: userId } },
        fields: ['email']
      }));

      const email = targetUser?.[0]?.email;

      if (email) {
        // 2. Find system user by email
        // 2. Find system user by email using Core Method
        const systemUsers = await directus.request(readUsers({
          filter: { email: { _eq: email } },
          fields: ['id']
        }));

        // 3. Delete System User if found
        if (systemUsers && systemUsers.length > 0) {
          await directus.request(deleteSystemUser(systemUsers[0].id));
          console.log(`System user for ${email} deleted.`);
        }
      }

      // 4. Delete App Profile
      await directus.request(deleteItem('app_users', userId));

      toast({
        title: "Usuário excluído",
        description: "Removido do sistema e login revogado."
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Delete Error:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    users,
    isLoading,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser,
    refetch: fetchUsers
  };
};
