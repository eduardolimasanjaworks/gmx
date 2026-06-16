#!/usr/bin/env node
/**
 * Cria coleções config_rotas, tipos_operacao, telefones_notificacao no Directus GMX.
 * Uso: DIRECTUS_URL=... node scripts/setup-config-ia-directus.js
 */
const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8057').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'gmx@gmx.com';
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin123';
const ADMIN_POLICY = process.env.DIRECTUS_ADMIN_POLICY || '7fb88d53-685e-41d6-87ef-5f22cc3ff5d8';

async function req(method, path, token, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function ensureCollection(token, name, icon, displayTemplate) {
  const { status } = await req('GET', `/collections/${name}`, token);
  if (status === 200) {
    console.log(`  coleção ${name} já existe`);
    return;
  }
  await req('POST', '/collections', token, {
    collection: name,
    meta: { icon, display_template: displayTemplate },
    schema: { name },
    fields: [
      {
        field: 'id',
        type: 'integer',
        schema: { is_primary_key: true, has_auto_increment: true },
        meta: { hidden: true },
      },
    ],
  });
  console.log(`  coleção ${name} criada`);
}

async function ensureField(token, collection, field, type, meta = {}) {
  const { status } = await req('GET', `/fields/${collection}/${field}`, token);
  if (status === 200) return;
  await req('POST', `/fields/${collection}`, token, {
    field,
    type,
    schema: {},
    meta,
  });
  console.log(`    campo ${collection}.${field}`);
}

async function ensurePermissions(token, collection) {
  for (const action of ['create', 'read', 'update', 'delete']) {
    await req('POST', '/permissions', token, {
      collection,
      action,
      policy: ADMIN_POLICY,
      permissions: {},
      validation: {},
      fields: ['*'],
    });
  }
}

async function main() {
  const { json: login } = await req('POST', '/auth/login', null, {
    email: EMAIL,
    password: PASSWORD,
  });
  const token = login?.data?.access_token;
  if (!token) {
    console.error('Login falhou', login);
    process.exit(1);
  }

  console.log('tipos_operacao...');
  await ensureCollection(token, 'tipos_operacao', 'category', '{{nome}}');
  await ensureField(token, 'tipos_operacao', 'nome', 'string', { required: true });
  await ensureField(token, 'tipos_operacao', 'ativo', 'boolean');
  await ensurePermissions(token, 'tipos_operacao');

  const defaults = ['ARROZ', 'LATA', 'ME', 'MALTE'];
  for (const nome of defaults) {
    const { json } = await req(
      'GET',
      `/items/tipos_operacao?filter[nome][_eq]=${nome}&limit=1`,
      token,
    );
    if (!json?.data?.length) {
      await req('POST', '/items/tipos_operacao', token, { nome, ativo: true });
      console.log(`    seed tipo ${nome}`);
    }
  }

  console.log('config_rotas...');
  await ensureCollection(token, 'config_rotas', 'route', '{{origem}} → {{destino}}');
  await ensureField(token, 'config_rotas', 'origem', 'string', { required: true });
  await ensureField(token, 'config_rotas', 'destino', 'string', { required: true });
  await ensureField(token, 'config_rotas', 'operacao_id', 'integer');
  await ensureField(token, 'config_rotas', 'operacao', 'string');
  await ensureField(token, 'config_rotas', 'valor_minimo', 'decimal');
  await ensureField(token, 'config_rotas', 'valor_maximo', 'decimal');
  await ensureField(token, 'config_rotas', 'ativo', 'boolean');
  await ensurePermissions(token, 'config_rotas');

  console.log('telefones_notificacao...');
  await ensureCollection(token, 'telefones_notificacao', 'phone', '{{nome}} — {{telefone}}');
  await ensureField(token, 'telefones_notificacao', 'nome', 'string', { required: true });
  await ensureField(token, 'telefones_notificacao', 'telefone', 'string', { required: true });
  await ensureField(token, 'telefones_notificacao', 'ativo', 'boolean');
  await ensureField(token, 'telefones_notificacao', 'observacao', 'text');
  await ensurePermissions(token, 'telefones_notificacao');

  console.log('OK — config IA Directus');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
