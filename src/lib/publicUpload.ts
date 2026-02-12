export async function uploadPublicFile(opts: { file: File; path?: string }): Promise<string> {
  const form = new FormData();
  form.append('file', opts.file);
  if (opts.path) form.append('path', opts.path);

  const res = await fetch('/upload', { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || json?.message || `Upload failed (${res.status})`);
  }

  // retorna URL absoluta para persistir no Directus
  const url = json?.url as string | undefined;
  if (!url) throw new Error('Upload response missing url');
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // importante: a URL pode vir como /uploads/... e o Vite pode estar em outra porta
  return `${window.location.origin}${url}`;
}

export async function deletePublicFileByUrl(url: string): Promise<void> {
  // suporta apenas URLs locais do /uploads
  const origin = window.location.origin;
  if (!url.startsWith(origin)) return;
  const rel = url.slice(origin.length);
  if (!rel.startsWith('/uploads/')) return;
  const path = rel.replace('/uploads/', '');
  await fetch(`/upload?path=${encodeURIComponent(path)}`, { method: 'DELETE' }).catch(() => {});
}

