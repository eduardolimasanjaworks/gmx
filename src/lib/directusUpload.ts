import { directus, directusUrl } from './directus';
import { uploadFiles } from '@directus/sdk';
import { uploadPublicFile } from './publicUpload';

/**
 * Upload de arquivo — tenta Directus Files; fallback para servidor local /upload.
 */
export async function uploadToDirectus(file: File, folder?: string, token?: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
        formData.append('folder', folder);
    }

    let authToken = token;
    if (!authToken) {
        authToken = localStorage.getItem('directus_token') || '';
    }

    try {
        const response = await fetch(`${directusUrl}/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            const status = response.status;
            if (status === 503 || status === 403 || status === 401) {
                console.warn(`Directus /files ${status} — usando upload público local`);
                return uploadPublicFile({ file, path: folder });
            }
            throw new Error(`Upload falhou (${status}): ${errorText}`);
        }

        const result = await response.json();
        const fileId = result.data.id;
        return `${directusUrl}/assets/${fileId}`;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Upload falhou')) {
            throw error;
        }
        console.warn('Directus indisponível — fallback upload público', error);
        return uploadPublicFile({ file, path: folder });
    }
}
