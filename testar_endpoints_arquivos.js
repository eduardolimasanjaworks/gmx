/**
 * Testa endpoints relacionados a arquivos e system collections no Directus.
 */
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

const PATHS = [
  '/files?limit=1',
  '/items/directus_files?limit=1',
  '/items/directus_files?fields=id,filename_download&limit=1',
  '/items/directus_folders?limit=1',
  '/items/directus_users?limit=1',
];

async function main() {
  console.log('🧪 Testando endpoints (mesmo token dos scripts)...\n');

  for (const path of PATHS) {
    const res = await fetch(DIRECTUS_URL + path, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    const msg = body?.errors?.[0]?.message || '';
    console.log(`${path} -> ${res.status}${msg ? ` | ${msg}` : ''}`);
  }
}

main().catch((e) => {
  console.error('❌ Erro:', e);
  process.exitCode = 1;
});

