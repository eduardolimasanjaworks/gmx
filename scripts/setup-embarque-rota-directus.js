#!/usr/bin/env node
/**
 * Fase 1 — Campos de rota em embarques + coleção embarque_rota_log (auditoria).
 * Pré-requisito: coleção embarques já existe no Directus.
 *
 * Uso: DIRECTUS_URL=... DIRECTUS_ADMIN_EMAIL=... DIRECTUS_ADMIN_PASSWORD=... \
 *      node scripts/setup-embarque-rota-directus.js
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

  const { status: embStatus } = await req('GET', '/collections/embarques', token);
  if (embStatus !== 200) {
    console.error('Coleção embarques não encontrada — crie antes de rodar este script.');
    process.exit(1);
  }

  console.log('embarques — campos de rota/oferta...');
  await ensureField(token, 'embarques', 'config_rota_id', 'integer', {
    note: 'FK lógica para config_rotas (negociação min/máx)',
  });
  await ensureField(token, 'embarques', 'rota_status', 'string', {
    interface: 'select-dropdown',
    options: {
      choices: [
        { text: 'Correlacionada', value: 'correlacionada' },
        { text: 'Pendente', value: 'pendente' },
        { text: 'Manual', value: 'manual' },
      ],
    },
    note: 'Estado da correlação com config_rotas',
  });
  await ensureField(token, 'embarques', 'operacao', 'string', {
    note: 'Tipo de operação (arroz, lata, ME…) — define pool de motoristas',
  });
  await ensureField(token, 'embarques', 'valor_ofertado', 'decimal', {
    note: 'Valor anunciado na mensagem WhatsApp ao motorista',
  });
  await ensureField(token, 'embarques', 'valor_minimo', 'decimal', {
    note: 'Piso negociável (copiado de config_rotas no match)',
  });
  await ensureField(token, 'embarques', 'valor_maximo', 'decimal', {
    note: 'Teto negociável (copiado de config_rotas no match)',
  });
  await ensureField(token, 'embarques', 'follow_id', 'integer', {
    note: 'Vínculo opcional com registro importado via Follow/CSV',
  });
  await ensureField(token, 'embarques', 'oferta_disparada_em', 'timestamp', {
    note: 'Quando o WhatsApp foi enviado ao motorista (iagmx)',
  });
  await ensureField(token, 'embarques', 'oferta_motorista_id', 'integer', {
    note: 'cadastro_motorista.id do motorista que recebeu o disparo',
  });

  console.log('embarque_rota_log — auditoria...');
  await ensureCollection(token, 'embarque_rota_log', 'history', 'Embarque #{{embarque_id}} — {{acao}}');
  await ensureField(token, 'embarque_rota_log', 'embarque_id', 'integer', { required: true });
  await ensureField(token, 'embarque_rota_log', 'acao', 'string', { required: true });
  await ensureField(token, 'embarque_rota_log', 'config_rota_id_antes', 'integer');
  await ensureField(token, 'embarque_rota_log', 'config_rota_id_depois', 'integer');
  await ensureField(token, 'embarque_rota_log', 'usuario', 'string');
  await ensureField(token, 'embarque_rota_log', 'detalhes', 'json');
  await ensurePermissions(token, 'embarque_rota_log');

  console.log('OK — Fase 1 Directus (embarque + rota + auditoria)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
