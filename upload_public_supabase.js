/**
 * Upload público via HTTP para Supabase Storage (sem depender do frontend).
 *
 * Uso:
 *   node upload_public_supabase.js <arquivo> <destino-no-bucket>
 *
 * Exemplo:
 *   node upload_public_supabase.js .\\foto.jpg shipments/63/1700000000-foto.jpg
 *
 * Requer env vars:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 * Opcional:
 *   SUPABASE_BUCKET (default: gmx-uploads)
 */

import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'gmx-uploads';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERRO: defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente.');
  process.exit(1);
}

const filePath = process.argv[2];
const objectPath = process.argv[3];

if (!filePath || !objectPath) {
  console.error('Uso: node upload_public_supabase.js <arquivo> <destino-no-bucket>');
  process.exit(1);
}

const abs = path.resolve(filePath);
const data = fs.readFileSync(abs);

// Best-effort content-type
const ext = path.extname(abs).toLowerCase();
const contentType =
  ext === '.pdf' ? 'application/pdf' :
    ext === '.png' ? 'image/png' :
      (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' :
        'application/octet-stream';

const url = `${SUPABASE_URL.replace(/\\/$/, '')}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': contentType,
  },
  body: data,
});

let body = null;
try {
  body = await res.json();
} catch {
  body = null;
}

if (!res.ok) {
  console.error('Upload falhou:', res.status, body?.message || body || '');
  process.exit(1);
}

const publicUrl = `${SUPABASE_URL.replace(/\\/$/, '')}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
console.log('OK');
console.log('public_url:', publicUrl);

