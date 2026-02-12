/**
 * Inspeciona roles e policies no Directus (modelo baseado em policies).
 */
const DIRECTUS_URL = 'http://91.99.137.101:8057';
const TOKEN = '1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah';

async function getJson(path) {
  const res = await fetch(DIRECTUS_URL + path, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function main() {
  console.log('🔎 Server info...\n');
  {
    const { res, json } = await getJson('/server/info');
    console.log('GET /server/info ->', res.status);
    if (json?.data) {
      console.log('directus:', json.data.directus);
      console.log('node:', json.data.node);
    }
  }

  console.log('\n🔎 Policies (limit 50)...\n');
  {
    const { res, json } = await getJson('/policies?limit=50');
    console.log('GET /policies ->', res.status, '| count:', json?.data?.length || 0);
    for (const p of json?.data || []) {
      console.log('-', p.id, '|', p.name);
    }
  }

  console.log('\n🔎 Roles (limit 50, fields=*)...\n');
  {
    const { res, json } = await getJson('/roles?limit=50&fields=*');
    console.log('GET /roles ->', res.status, '| count:', json?.data?.length || 0);
    for (const r of json?.data || []) {
      console.log('-', r.id, '|', r.name, '| admin_access:', r.admin_access, '| app_access:', r.app_access);
    }
  }

  console.log('\n🔎 Role Administrator (fields=*.*)...\n');
  {
    const roleId = '00cc7390-e50f-4ea1-bf3b-99f70b777d2e';
    const { res, json } = await getJson(`/roles/${roleId}?fields=*.*`);
    console.log(`GET /roles/${roleId} ->`, res.status);
    console.log(JSON.stringify(json?.data, null, 2));
  }
}

main().catch((e) => {
  console.error('❌ Erro:', e);
  process.exitCode = 1;
});

