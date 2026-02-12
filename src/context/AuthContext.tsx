import React, { createContext, useContext, useState, useEffect } from 'react';
import { directus, directusUrl } from '@/lib/directus';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('directus_token'));
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const enrichUser = async (directusUser: any) => {
        try {
            if (!directusUser || !directusUser.email) return directusUser;

            const appUsers = await directus.request(readItems('app_users', {
                filter: { email: { _eq: directusUser.email } },
                fields: ['*', 'role_id.*', 'permissions']
            }));

            if (appUsers && appUsers.length > 0) {
                const appProfile = appUsers[0];
                let effectiveRole = appProfile.role_id;

                // Handle Custom Permissions without Role
                if (!effectiveRole && appProfile.permissions && appProfile.permissions.length > 0) {
                    effectiveRole = {
                        id: -1,
                        name: 'Personalizado',
                        permissions: appProfile.permissions
                    };
                }

                return {
                    ...directusUser,
                    app_role: effectiveRole
                };
            }
            return directusUser;
        } catch (error) {
            Logger.warn("User profile enrichment failed (app_users match not found)", error);
            return directusUser;
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

            const baseUrl = directusUrl.endsWith('/') ? directusUrl.slice(0, -1) : directusUrl;
            const refreshUrl = `${baseUrl}/auth/refresh`;

            const response = await fetch(refreshUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshTokenValue, mode: 'json' })
            });

            const data = await response.json();

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
            Logger.info(`Starting login for: ${email}`);

            const baseUrl = directusUrl.endsWith('/') ? directusUrl.slice(0, -1) : directusUrl;
            const loginUrl = `${baseUrl}/auth/login`;

            // Logger.info("Login Endpoint:", loginUrl);

            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, mode: 'json' })
            });

            const data = await response.json();

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
            toast({
                title: "Erro de Autenticação",
                description: error.message || "Não foi possível conectar ao servidor",
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
