import React, { createContext, useContext, useState, useEffect } from 'react';
import { directus, getDirectusUrl } from '@/lib/directus';
import { readMe, readItems } from '@directus/sdk';
import { useToast } from '@/hooks/use-toast';
import { Logger } from '@/lib/logger';

interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string | null;
    app_role?: {
        id: number;
        name: string;
        permissions: string[];
    };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    refreshToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const FULL_APP_PERMISSIONS = [
    'cadastros',
    'disponiveis',
    'embarques',
    'historico',
    'dashboard',
    'faq',
    'usuarios',
    'gestao_equipe',
] as const;

const normalizePermissions = (value: unknown): string[] => {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
};

const normalizeAppRole = (role: any) => {
    if (!role) return null;

    const permissions = normalizePermissions(role.permissions);
    const name = role.name || role.nome || 'Cargo GMX';

    return {
        id: role.id ?? -1,
        name,
        permissions,
    };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('directus_token'));
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const buildAdminFallbackProfile = async (directusUser: any) => {
        try {
            const storedToken = localStorage.getItem('directus_token');
            if (!storedToken) return directusUser;

            const baseUrl = getDirectusUrl().replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/permissions/me`, {
                headers: {
                    Authorization: `Bearer ${storedToken}`,
                },
            });

            if (!response.ok) return directusUser;

            const data = await response.json().catch(() => null);
            const perms = data?.data;
            const isSystemAdmin =
                perms?.directus_users?.read?.access === 'full' &&
                perms?.directus_roles?.read?.access === 'full' &&
                perms?.directus_permissions?.read?.access === 'full';

            if (!isSystemAdmin) return directusUser;

            return {
                ...directusUser,
                app_role: {
                    id: -999,
                    name: 'Administrador do Sistema',
                    permissions: [...FULL_APP_PERMISSIONS],
                },
            };
        } catch (error) {
            Logger.warn('System admin fallback failed', error);
            return directusUser;
        }
    };

    const enrichUser = async (directusUser: any) => {
        try {
            if (!directusUser || !directusUser.email) return directusUser;

            const appUsers = await directus.request(readItems('app_users', {
                filter: { email: { _eq: directusUser.email } },
                fields: ['*', 'role_id.*']
            }));

            if (appUsers && appUsers.length > 0) {
                const appProfile = appUsers[0];
                let effectiveRole = normalizeAppRole(appProfile.role_id);

                // Handle Custom Permissions without Role
                if (!effectiveRole) {
                    const customPermissions = normalizePermissions(appProfile.permissions);
                    if (customPermissions.length > 0) {
                        effectiveRole = {
                            id: -1,
                            name: 'Personalizado',
                            permissions: customPermissions
                        };
                    }
                }

                if (!effectiveRole || effectiveRole.permissions.length === 0) {
                    return await buildAdminFallbackProfile(directusUser);
                }

                return {
                    ...directusUser,
                    app_role: effectiveRole
                };
            }
            return await buildAdminFallbackProfile(directusUser);
        } catch (error) {
            Logger.warn("User profile enrichment failed (app_users match not found)", error);
            return await buildAdminFallbackProfile(directusUser);
        }
    };

    const refreshToken = async () => {
        try {
            const refreshTokenValue = localStorage.getItem('directus_refresh_token');
            if (!refreshTokenValue) {
                // Estado comum quando o usuário tem apenas access_token antigo no storage
                // (ex: limpou cookies/storage parcialmente). Tratar como logout.
                throw new Error('No refresh token available');
            }

            const baseUrl = getDirectusUrl().replace(/\/$/, '');
            const refreshUrl = `${baseUrl}/auth/refresh`;

            const response = await fetch(refreshUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshTokenValue, mode: 'json' })
            });

            const raw = await response.text();
            let data: { data?: { access_token?: string; refresh_token?: string }; errors?: { message?: string }[] };
            try {
                data = JSON.parse(raw);
            } catch {
                throw new Error(
                    'A API retornou uma resposta inválida (não JSON). Verifique se o Directus está no ar e se o proxy /api está configurado.'
                );
            }

            if (!response.ok) {
                throw new Error(data.errors?.[0]?.message || 'Token refresh failed');
            }

            const accessToken = data.data.access_token;
            const newRefreshToken = data.data.refresh_token;

            await directus.setToken(accessToken);
            localStorage.setItem('directus_token', accessToken);
            if (newRefreshToken) {
                localStorage.setItem('directus_refresh_token', newRefreshToken);
            }
            setToken(accessToken);

            return accessToken;
        } catch (error) {
            // Evitar ruído: ausência de refresh token é esperado em alguns cenários (primeiro acesso / storage inconsistente)
            const msg = (error as any)?.message || String(error);
            if (msg.includes('No refresh token available')) {
                Logger.warn("Token refresh skipped (no refresh token)", error);
            } else {
                Logger.error("Token refresh failed", error);
            }
            // If refresh fails, logout user
            setUser(null);
            localStorage.removeItem('directus_token');
            localStorage.removeItem('directus_refresh_token');
            setToken(null);
            throw error;
        }
    };

    const checkAuth = async () => {
        try {
            const storedToken = localStorage.getItem('directus_token');
            if (storedToken) {
                await directus.setToken(storedToken);
            }

            const userData = await directus.request(readMe({
                fields: ['id', 'first_name', 'last_name', 'email', 'role']
            }));

            if (userData) {
                const fullUser = await enrichUser(userData);
                setUser(fullUser as unknown as User);
                if (storedToken) setToken(storedToken);
            }
        } catch (error: any) {
            // If token expired, try to refresh
            if (error?.message?.includes('expired') || error?.response?.status === 401) {
                try {
                    // Se não existir refresh token, não adianta tentar refresh; apenas força logout limpo
                    if (!localStorage.getItem('directus_refresh_token')) {
                        setUser(null);
                        localStorage.removeItem('directus_token');
                        localStorage.removeItem('directus_refresh_token');
                        setToken(null);
                        return;
                    }
                    await refreshToken();
                    // Retry checkAuth after refresh
                    const userData = await directus.request(readMe({
                        fields: ['id', 'first_name', 'last_name', 'email', 'role']
                    }));
                    if (userData) {
                        const fullUser = await enrichUser(userData);
                        setUser(fullUser as unknown as User);
                    }
                } catch (refreshError) {
                    setUser(null);
                    localStorage.removeItem('directus_token');
                    localStorage.removeItem('directus_refresh_token');
                    setToken(null);
                }
            } else {
                setUser(null);
                localStorage.removeItem('directus_token');
                localStorage.removeItem('directus_refresh_token');
                setToken(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            const normalizedEmail = email.trim();
            Logger.info(`Starting login for: ${normalizedEmail}`);

            const baseUrl = getDirectusUrl().replace(/\/$/, '');
            const loginUrl = `${baseUrl}/auth/login`;

            const doLoginFetch = async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30_000);
                try {
                    return await fetch(loginUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: normalizedEmail, password, mode: 'json' }),
                        signal: controller.signal,
                    });
                } finally {
                    clearTimeout(timeout);
                }
            };

            let response: Response;
            try {
                response = await doLoginFetch();
            } catch (networkError: any) {
                if (networkError?.name === 'AbortError') {
                    throw new Error('Tempo esgotado ao conectar na API. Tente novamente.');
                }
                Logger.warn('Login network error, retrying once...', networkError?.message);
                await new Promise((r) => setTimeout(r, 800));
                response = await doLoginFetch();
            }

            const raw = await response.text();
            let data: { data?: { access_token?: string; refresh_token?: string }; errors?: { message?: string }[] };
            try {
                data = JSON.parse(raw);
            } catch {
                Logger.error("Login resposta não-JSON", raw.slice(0, 200));
                throw new Error(
                    'Servidor retornou HTML ou página de erro em vez de JSON. O Directus pode estar indisponível ou o disco do servidor cheio (PostgreSQL em recovery).'
                );
            }

            if (!response.ok) {
                Logger.error("Login Fetch Error", data);
                throw new Error(data.errors?.[0]?.message || 'Falha na autenticação');
            }

            const accessToken = data.data.access_token;
            const refreshToken = data.data.refresh_token;

            // Set token in SDK and Storage
            await directus.setToken(accessToken);
            localStorage.setItem('directus_token', accessToken);
            if (refreshToken) {
                localStorage.setItem('directus_refresh_token', refreshToken);
            }
            setToken(accessToken);

            Logger.info("Login Token received. Fetching user data...");

            // Fetch User Data
            const userData = await directus.request(readMe({
                fields: ['id', 'first_name', 'last_name', 'email', 'role']
            }));

            const fullUser = await enrichUser(userData);
            setUser(fullUser as unknown as User);

            Logger.info("User logged in successfully", fullUser.email);

            toast({
                title: "Login realizado com sucesso",
                description: "Bem-vindo ao GMX!",
            });

        } catch (error: any) {
            Logger.error("Login Exception", error.message);
            const isNetwork =
                error?.message === 'Failed to fetch' ||
                error?.name === 'TypeError' ||
                error?.name === 'AbortError';
            toast({
                title: "Erro de Autenticação",
                description: isNetwork
                    ? 'Não foi possível contactar a API em /api. Verifique sua internet ou aguarde alguns segundos e tente de novo.'
                    : (error.message || "Não foi possível conectar ao servidor"),
                variant: "destructive",
            });
            // throw error; 
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await directus.setToken(null);
            localStorage.removeItem('directus_token');
            localStorage.removeItem('directus_refresh_token');
            setUser(null);
            setToken(null);
            Logger.info("User logged out");

            toast({
                title: "Logout realizado",
                description: "Você saiu do sistema.",
            });
        } catch (error) {
            console.error("Logout Error:", error);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, checkAuth, refreshToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
