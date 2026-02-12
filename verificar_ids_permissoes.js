/**
 * Verifica se permissões recém-criadas têm o campo `role` persistido.
 * (Usa API direta com fields incluindo role.)
 */
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

// Ajuste aqui se quiser checar outros IDs
const IDS = [366, 367, 368, 369, 374, 375, 376, 377, 378, 379, 380, 381];

async function main() {
  console.log('🔍 Verificando permissões por ID (fields incluindo role)...\n');

  for (const id of IDS) {
    const res = await fetch(
      `${DIRECTUS_URL}/permissions/${id}?fields=id,collection,action,role,policy,fields`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.log(`ID ${id} -> HTTP ${res.status}`, json?.errors?.[0]?.message || '');
      continue;
    }

    const p = json?.data || {};
    const hasRoleField = Object.prototype.hasOwnProperty.call(p, 'role');
    console.log(
      `ID ${p.id} | ${p.collection}.${p.action} | role: ${
        hasRoleField ? String(p.role) : '<role not returned>'
      } | policy: ${String(p.policy)}`
    );
  }
}

main().catch((e) => {
  console.error('❌ Erro:', e);
  process.exitCode = 1;
});

