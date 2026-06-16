#!/usr/bin/env node
/**
 * Campos PLACAS em embarques + auditoria embarque_placas_log.
 *
 * Uso: DIRECTUS_URL=... DIRECTUS_ADMIN_EMAIL=... DIRECTUS_ADMIN_PASSWORD=... \
 *      node scripts/setup-embarque-placas-directus.js
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

async function ensureField(token, collection, field, type, meta = {}, schema = {}) {
  const { status } = await req('GET', `/fields/${collection}/${field}`, token);
  if (status === 200) return;
  const body = { field, type, meta, schema };
  const { status: postStatus, json } = await req('POST', `/fields/${collection}`, token, body);
  if (postStatus >= 400) {
    console.warn(`    AVISO campo ${collection}.${field}:`, json?.errors?.[0]?.message || postStatus);
    return;
  }
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

  console.log('embarques — campos PLACAS...');
  await ensureField(token, 'embarques', 'placas_ok', 'boolean', {
    interface: 'boolean',
    note: 'Placas do veículo conferidas pelo atendente',
    width: 'half',
  });
  await ensureField(token, 'embarques', 'placas_ok_em', 'timestamp', {
    interface: 'datetime',
    note: 'Data/hora em que o atendente marcou PLACAS OK',
    width: 'half',
  });
  await ensureField(token, 'embarques', 'placas_ok_por_nome', 'string', {
    note: 'Nome do atendente que marcou PLACAS OK',
    width: 'half',
  });
  await ensureField(token, 'embarques', 'placas_ok_por_id', 'string', {
    note: 'ID Directus do atendente que marcou PLACAS OK',
    width: 'half',
  });

  console.log('embarque_placas_log — auditoria marcar/desmarcar...');
  await ensureCollection(token, 'embarque_placas_log', 'history', 'Embarque #{{embarque_id}} — {{acao}}');
  await ensureField(token, 'embarque_placas_log', 'embarque_id', 'integer', { required: true });
  await ensureField(token, 'embarque_placas_log', 'acao', 'string', {
    required: true,
    interface: 'select-dropdown',
    options: {
      choices: [
        { text: 'Marcado', value: 'marcado' },
        { text: 'Desmarcado', value: 'desmarcado' },
      ],
    },
  });
  await ensureField(token, 'embarque_placas_log', 'atendente_nome', 'string', { required: true });
  await ensureField(token, 'embarque_placas_log', 'atendente_id', 'string');
  await ensureField(token, 'embarque_placas_log', 'observacao', 'text', {
    note: 'Motivo obrigatório ao desmarcar',
  });
  await ensurePermissions(token, 'embarque_placas_log');

  console.log('OK — campos PLACAS + auditoria embarque_placas_log');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
