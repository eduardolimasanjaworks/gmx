import { directus, directusUrl } from './directus';
import { uploadFiles } from '@directus/sdk';

/**
 * Upload de arquivo direto para o Directus Files
 * Retorna OUV da URL do arquivo para uso no frontend
 */
export async function uploadToDirectus(file: File, folder?: string, token?: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
        formData.append('folder', folder);
    }

    // Tentar pegar o token do SDK se não for passado
    let authToken = token;
    if (!authToken) {
        // Tenta pegar do localStorage como fallback
        authToken = localStorage.getItem('directus_token') || '';
    }

    try {
        // Upload direto via fetch para garantir controle dos headers
        const response = await fetch(`${directusUrl}/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload falhou (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        const fileId = result.data.id;

        // Retorna a URL completa do arquivo
        return `${directusUrl}/assets/${fileId}`;
    } catch (error) {
        console.error('Erro no upload para Directus:', error);
        throw error;
    }
}
