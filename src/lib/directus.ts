import { createDirectus, rest, authentication } from '@directus/sdk';

// Configuração da URL do Directus
// Em DEV, usamos window.location.origin + '/api' para garantir uma URL absoluta válida
// que aponte para o nosso Proxy do Vite (evitando CORS).
// O SDK do Directus exige uma URL válida no construtor.

const getDirectusUrl = () => {
    if (import.meta.env.DEV) {
        // Verifica se 'window' existe (pode não existir em SSR/Build time, mas aqui é SPA React)
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/api`;
        }
        return 'http://localhost:8080/api'; // Fallback seguro
    }
    return import.meta.env.VITE_DIRECTUS_URL || "http://91.99.137.101:8057";
};

export const directusUrl = getDirectusUrl();

// Use authentication() to allow dynamic user login and auto-refresh
export const directus = createDirectus(directusUrl)
    .with(authentication('json', { autoRefresh: true }))
    .with(rest());

// Client for public/anonymous access (Dashboard stats, etc.)
// Relies on public permissions being set on the collections
export const publicDirectus = createDirectus(directusUrl).with(rest());
