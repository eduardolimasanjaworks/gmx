/**
 * Auditoria rápida das coleções do dashboard (rodar com token se REST anônimo falhar).
 * Uso: npx tsx scripts/dashboard-audit-directus.ts
 */
const BASE = process.env.VITE_DIRECTUS_URL ?? 'http://91.99.137.101:8057';

const collections = ['follow', 'embarques', 'disponivel'] as const;

async function probe(name: string) {
  const url = `${BASE}/items/${name}?limit=1&fields=id,status,date_created`;
  const res = await fetch(url);
  const body = await res.text();
  console.log(`[${name}] HTTP ${res.status} — ${body.slice(0, 200)}`);
}

for (const c of collections) {
  await probe(c);
}
