#!/usr/bin/env node
/**
 * Campo status em disponivel (disponivel | carregado | indisponivel).
 *
 * Uso: DIRECTUS_URL=... DIRECTUS_ADMIN_EMAIL=... DIRECTUS_ADMIN_PASSWORD=... \
 *      node scripts/setup-disponivel-status-directus.js
 */
const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8057').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'gmx@gmx.com';
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin123';

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

async function ensureField(token, collection, field, type, meta = {}, schema = {}) {
  const { status } = await req('GET', `/fields/${collection}/${field}`, token);
  if (status === 200) {
    console.log(`  campo ${collection}.${field} já existe`);
    return;
  }
  const { status: postStatus, json } = await req('POST', `/fields/${collection}`, token, {
    field,
    type,
    meta,
    schema,
  });
  if (postStatus >= 400) {
    console.warn(`    AVISO campo ${collection}.${field}:`, json?.errors?.[0]?.message || postStatus);
    return;
  }
  console.log(`    campo ${collection}.${field} criado`);
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

  console.log('disponivel — campo status...');
  await ensureField(
    token,
    'disponivel',
    'status',
    'string',
    {
      interface: 'select-dropdown',
      note: 'Status operacional: vazio/disponível, carregado ou indisponível',
      options: {
        choices: [
          { text: 'Disponível', value: 'disponivel' },
          { text: 'Carregado', value: 'carregado' },
          { text: 'Indisponível', value: 'indisponivel' },
        ],
      },
    },
    { is_nullable: true, default_value: 'disponivel' },
  );

  console.log('OK — disponivel.status');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
