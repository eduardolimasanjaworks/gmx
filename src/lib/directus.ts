import { createDirectus, rest, authentication } from '@directus/sdk';

// Configuração da URL do Directus
// Em DEV, usamos window.location.origin + '/api' para garantir uma URL absoluta válida
// que aponte para o nosso Proxy do Vite (evitando CORS).
// O SDK do Directus exige uma URL válida no construtor.

export const getDirectusUrl = () => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/api`;
    }
    return '/api';
};

/** URL resolvida no momento do uso (evita origin errado se o módulo carregar cedo). */
export const directusUrl = getDirectusUrl();

// Use authentication() to allow dynamic user login and auto-refresh
export const directus = createDirectus(getDirectusUrl())
    .with(authentication('json', { autoRefresh: true }))
    .with(rest());

// Client for public/anonymous access (Dashboard stats, etc.)
// Relies on public permissions being set on the collections
export const publicDirectus = createDirectus(directusUrl).with(rest());
