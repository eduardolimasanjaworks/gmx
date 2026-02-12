/**
 * Servidor de upload PÚBLICO (sem autenticação).
 *
 * Modos:
 * - Local FS (default): salva em disco e serve via /uploads
 * - Supabase Storage (recomendado): envia para o Supabase e retorna URL pública
 *
 * Endpoint:
 * - POST http://localhost:8099/upload  (multipart/form-data: file, path opcional)
 *
 * OBS: Isto é propositalmente público (como você pediu). Use com cuidado em produção.
 */

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';

const PORT = Number(process.env.UPLOAD_PORT || 8099);
const ROOT_DIR = process.cwd();
const UPLOADS_DIR = path.join(ROOT_DIR, 'public_uploads');

// Optional Supabase mode (keeps secrets OUT of the frontend)
// Load .upload.env if present (no extra deps)
try {
  const envPath = path.join(ROOT_DIR, '.upload.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
} catch {
  // ignore
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'gmx-uploads';
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();

const uploadDisk = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const safe = (file.originalname || 'file')
        .replace(/[^\w.\-()+\s]/g, '_')
        .slice(0, 180);
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
});

const uploadMemory = multer({ storage: multer.memoryStorage() });

function sanitizeRel(p) {
  const raw = (p || '').toString().replace(/\\/g, '/');
  const cleaned = raw
    .split('/')
    .filter(Boolean)
    .map((seg) => seg.replace(/[^\w.\-()+]/g, '_'))
    .join('/');
  return cleaned;
}

app.use('/uploads', express.static(UPLOADS_DIR, { fallthrough: false }));

async function ensureSupabaseBucketPublic() {
  if (!USE_SUPABASE) return;
  // Best-effort: create bucket if missing & make public
  try {
    const base = SUPABASE_URL.replace(/\/$/, '');
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    };

    // Try create
    await fetch(`${base}/storage/v1/bucket`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: SUPABASE_BUCKET, name: SUPABASE_BUCKET, public: true }),
    }).catch(() => {});

    // Try update public (ignore failures)
    await fetch(`${base}/storage/v1/bucket/${encodeURIComponent(SUPABASE_BUCKET)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ public: true }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

app.post('/upload', (req, res, next) => {
  const handler = USE_SUPABASE ? uploadMemory.single('file') : uploadDisk.single('file');
  handler(req, res, next);
}, async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'file is required' });

  const rel = sanitizeRel(req.body?.path);
  let finalRel = USE_SUPABASE ? (file.originalname || 'file') : file.filename;

  if (USE_SUPABASE) {
    await ensureSupabaseBucketPublic();

    const safeName = (file.originalname || 'file')
      .replace(/[^\w.\-()+\s]/g, '_')
      .slice(0, 180);
    const objectPath = rel ? `${rel}/${Date.now()}-${safeName}` : `${Date.now()}-${safeName}`;

    const base = SUPABASE_URL.replace(/\/$/, '');
    const upUrl = `${base}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${objectPath}`;

    const upRes = await fetch(upUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': file.mimetype || 'application/octet-stream',
      },
      body: file.buffer,
    });

    if (!upRes.ok) {
      const txt = await upRes.text().catch(() => '');
      return res.status(502).json({ error: `Supabase upload failed (${upRes.status})`, details: txt.slice(0, 500) });
    }

    const publicUrl = `${base}/storage/v1/object/public/${encodeURIComponent(SUPABASE_BUCKET)}/${objectPath}`;
    return res.json({ url: publicUrl, path: objectPath, originalName: file.originalname });
  }

  if (rel) {
    const targetDir = path.join(UPLOADS_DIR, rel);
    fs.mkdirSync(targetDir, { recursive: true });
    const target = path.join(targetDir, file.filename);
    fs.renameSync(file.path, target);
    finalRel = `${rel}/${file.filename}`;
  }

  const url = `/uploads/${finalRel}`;
  return res.json({ url, path: finalRel, originalName: file.originalname });
});

app.delete('/upload', express.json(), (req, res) => {
  // delete público (opcional). Use ?path=...
  const rel = sanitizeRel(req.query?.path);
  if (!rel) return res.status(400).json({ error: 'path is required' });
  if (USE_SUPABASE) {
    const base = SUPABASE_URL.replace(/\/$/, '');
    fetch(`${base}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${rel}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })
      .then((r) => res.status(r.ok ? 200 : 404).json({ ok: r.ok }))
      .catch(() => res.status(404).json({ ok: false }));
    return;
  }

  const full = path.join(UPLOADS_DIR, rel);
  try {
    fs.unlinkSync(full);
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ ok: false });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Upload server (PUBLIC) on http://localhost:${PORT}`);
  if (USE_SUPABASE) {
    console.log(`   Mode: Supabase Storage (public) | bucket: ${SUPABASE_BUCKET}`);
    console.log(`   POST /upload -> returns { url: \"https://.../storage/v1/object/public/...\" }`);
  } else {
    console.log(`   Mode: Local FS | /uploads is public static`);
    console.log(`   POST /upload -> returns { url: \"/uploads/...\" }`);
  }
});

