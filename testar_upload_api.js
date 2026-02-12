/**
 * Testa upload de arquivo no Directus via /files (direto) e via proxy /api/files.
 * Objetivo: diagnosticar 503 no upload.
 */
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const PROXY_URL = 'http://localhost:8080/api';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

async function uploadTo(baseUrl) {
  const fd = new FormData();
  fd.append('file', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');

  const res = await fetch(`${baseUrl}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: fd,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  return { status: res.status, body };
}

async function main() {
  console.log('🧪 Upload direto no Directus...');
  const direct = await uploadTo(DIRECTUS_URL);
  console.log('status:', direct.status, 'msg:', direct.body?.errors?.[0]?.message || '');

  console.log('\n🧪 Upload via proxy local (/api)...');
  const proxy = await uploadTo(PROXY_URL);
  console.log('status:', proxy.status, 'msg:', proxy.body?.errors?.[0]?.message || '');
}

main().catch((e) => {
  console.error('❌ Erro:', e);
  process.exitCode = 1;
});

