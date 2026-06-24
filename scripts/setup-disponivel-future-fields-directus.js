#!/usr/bin/env node
/**
 * Garante campos explícitos de localização futura em `disponivel`.
 * Remove a ambiguidade entre destino da viagem atual e local onde ficará livre.
 * Uso: DIRECTUS_URL=... DIRECTUS_ADMIN_EMAIL=... DIRECTUS_ADMIN_PASSWORD=... node scripts/setup-disponivel-future-fields-directus.js
 */
const BASE = (process.env.DIRECTUS_URL || 'http://127.0.0.1:8057').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'gmx@gmx.com';
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin123';
const STATIC_TOKEN = process.env.DIRECTUS_TOKEN || '';

async function req(method, path, token, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
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

async function ensureField(token, collection, field, type, meta = {}) {
  const { status } = await req('GET', `/fields/${collection}/${field}`, token);
  if (status === 200) {
    console.log(`  campo ${collection}.${field} já existe`);
    return;
  }
  const created = await req('POST', `/fields/${collection}`, token, {
    field,
    type,
    schema: {},
    meta,
  });
  if (created.status >= 400) {
    throw new Error(`falha ao criar ${collection}.${field}: ${JSON.stringify(created.json)}`);
  }
  console.log(`  campo ${collection}.${field} criado`);
}

async function main() {
  let token = STATIC_TOKEN;
  if (!token) {
    const login = await req('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
    token = login.json?.data?.access_token;
    if (!token) throw new Error(`login falhou: ${JSON.stringify(login.json)}`);
  }

  console.log('Atualizando coleção disponivel...');
  await ensureField(token, 'disponivel', 'local_destino_atual', 'string', {
    interface: 'input',
    display_name: 'Local destino atual',
    note: 'Cidade/UF onde a viagem em andamento termina',
  });
  await ensureField(token, 'disponivel', 'local_liberacao_prevista', 'string', {
    interface: 'input',
    display_name: 'Local liberação prevista',
    note: 'Cidade/UF onde o motorista ficará livre para nova carga',
  });
  await ensureField(token, 'disponivel', 'local_liberacao_prevista_latitude', 'decimal', {
    interface: 'input',
    display_name: 'Latitude liberação prevista',
    note: 'Latitude resolvida para a localização futura',
  });
  await ensureField(token, 'disponivel', 'local_liberacao_prevista_longitude', 'decimal', {
    interface: 'input',
    display_name: 'Longitude liberação prevista',
    note: 'Longitude resolvida para a localização futura',
  });
  await ensureField(token, 'disponivel', 'local_liberacao_prevista_fonte', 'string', {
    interface: 'input',
    display_name: 'Fonte liberação prevista',
    note: 'Origem da coordenada futura: mapa_estatico, nominatim ou manual',
  });
  await ensureField(token, 'disponivel', 'local_liberacao_prevista_geocoded_at', 'timestamp', {
    interface: 'datetime',
    display_name: 'Liberação prevista geocoded at',
    note: 'Quando a coordenada futura foi resolvida',
  });
  await ensureField(token, 'disponivel', 'gps_timestamp', 'timestamp', {
    interface: 'datetime',
    display_name: 'GPS timestamp',
    note: 'Quando o GPS atual foi informado pelo motorista ou sistema',
  });

  console.log('OK - campos futuros da disponibilidade garantidos');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
