#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';

const BASE = (process.env.DIRECTUS_URL || process.env.VITE_DIRECTUS_URL || 'http://127.0.0.1:8057').replace(/\/$/, '');
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'gmx@gmx.com';
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin123';
const EXCEL_DIR = process.env.ROTAS_EXCEL_DIR || '/root/erp e ia gmx/excel';
const STATIC_TOKEN = process.env.DIRECTUS_TOKEN || process.env.VITE_DIRECTUS_TOKEN || '';

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function parseMoney(value) {
  const raw = String(value ?? '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNumber(value) {
  const raw = String(value ?? '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function req(method, pathname, token, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE}${pathname}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  }).then(async (res) => {
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
  });
}

async function login() {
  if (STATIC_TOKEN) return STATIC_TOKEN;
  const { json } = await req('POST', '/auth/login', null, { email: EMAIL, password: PASSWORD });
  const token = json?.data?.access_token;
  if (!token) throw new Error(`Falha no login do Directus: ${JSON.stringify(json)}`);
  return token;
}

async function ensureField(token, collection, field, type, meta = {}) {
  const { status } = await req('GET', `/fields/${collection}/${field}`, token);
  if (status === 200) return;
  const result = await req('POST', `/fields/${collection}`, token, {
    field,
    type,
    schema: {},
    meta,
  });
  if (result.status >= 400) {
    throw new Error(`Falha ao criar campo ${collection}.${field}: ${JSON.stringify(result.json)}`);
  }
}

async function ensureSchema(token) {
  const fields = [
    ['origem_latitude', 'decimal'],
    ['origem_longitude', 'decimal'],
    ['destino_latitude', 'decimal'],
    ['destino_longitude', 'decimal'],
    ['fonte_planilha', 'string'],
    ['especie_produto', 'string'],
    ['origem_regiao', 'string'],
    ['uf_origem', 'string'],
    ['uf_destino', 'string'],
    ['capacidade', 'string'],
    ['distancia_km', 'decimal'],
    ['frete_peso_cargox', 'decimal'],
    ['frete_bruto_icms', 'decimal'],
    ['frete_pis_cofins', 'decimal'],
    ['frete_liquido_cargox', 'decimal'],
    ['contrato_frete_gmx', 'decimal'],
    ['frete_peso_terceiro', 'decimal'],
    ['total_terceiro', 'decimal'],
    ['km_rodado_frete_atual', 'decimal'],
    ['icms', 'string'],
    ['real_pallet_atual', 'decimal'],
    ['evidencia', 'text'],
    ['status_tarifa', 'string'],
    ['km_rodado_terceiro', 'decimal'],
    ['frete_terceiro_padrao', 'decimal'],
    ['frete_terceiro_maximo', 'decimal'],
  ];
  for (const [field, type] of fields) {
    await ensureField(token, 'config_rotas', field, type);
  }
}

async function ensureTipoOperacao(token, nome) {
  const op = normalize(nome);
  if (!op) return;
  const { json } = await req(
    'GET',
    `/items/tipos_operacao?filter[nome][_eq]=${encodeURIComponent(op)}&limit=1`,
    token,
  );
  if (json?.data?.length) return;
  await req('POST', '/items/tipos_operacao', token, { nome: op, ativo: true });
}

function chaveRota(item) {
  return [
    normalize(item.operacao),
    normalize(item.origem),
    normalize(item.destino),
    normalize(item.capacidade),
  ].join('|');
}

function mapArrozRow(row) {
  const valorMinimo = parseMoney(row['TOTAL  Terceiro']);
  const valorMaximo = parseMoney(row['CONTRATO FRETE GMX']);
  return {
    origem: String(row.ORIGEM ?? '').trim(),
    destino: String(row.DESTINO ?? '').trim(),
    operacao: normalize(row['ESPÉCIE / PRD']),
    valor_minimo: valorMinimo,
    valor_maximo: valorMaximo ?? valorMinimo,
    ativo: true,
    fonte_planilha: 'ROTAS ARROZ',
    especie_produto: String(row['ESPÉCIE / PRD'] ?? '').trim() || undefined,
    origem_regiao: String(row['ORIGEM REGIÃO'] ?? '').trim() || undefined,
    uf_origem: String(row['UF/O'] ?? '').trim() || undefined,
    uf_destino: String(row['UF/D'] ?? '').trim() || undefined,
    capacidade: String(row['CAP.'] ?? '').trim() || undefined,
    distancia_km: parseNumber(row.Distância),
    frete_peso_cargox: parseMoney(row['FRETE PESO CARGOX (leilão)']),
    frete_bruto_icms: parseMoney(row['FRETE BRUTO ICMS']),
    frete_pis_cofins: parseMoney(row['FRETE PIS/COFINS']),
    frete_liquido_cargox: parseMoney(row['FRETE LÍQUIDO CARGOX']),
    contrato_frete_gmx: parseMoney(row['CONTRATO FRETE GMX']),
    frete_peso_terceiro: parseMoney(row['Frete peso Terceiro']),
    total_terceiro: parseMoney(row['TOTAL  Terceiro']),
  };
}

function normalizarOperacaoPlanilha(value) {
  const op = normalize(value);
  if (op === 'MAT.EMBALAGEM') return 'ME';
  return op;
}

function mapLataRow(row) {
  const valorMinimo = parseMoney(row['Frete Terceiro Padrão']);
  const valorMaximo = parseMoney(row['Frete terceiro máximo']);
  return {
    origem: String(row.ORIGEM ?? '').trim(),
    destino: String(row.DESTINO ?? '').trim(),
    operacao: normalizarOperacaoPlanilha(row['ESPÉCIE / PRD']),
    valor_minimo: valorMinimo,
    valor_maximo: valorMaximo ?? valorMinimo,
    ativo: true,
    fonte_planilha: 'ROTAS LATA',
    especie_produto: String(row['ESPÉCIE / PRD'] ?? '').trim() || undefined,
    uf_origem: String(row['UF/O'] ?? '').trim() || undefined,
    uf_destino: String(row['UF/D'] ?? '').trim() || undefined,
    capacidade: String(row['CAP.'] ?? '').trim() || undefined,
    distancia_km: parseNumber(row.Distância),
    km_rodado_frete_atual: parseMoney(row['km Rodado Frete Atual']),
    icms: String(row.ICMS ?? '').trim() || undefined,
    frete_bruto_icms: parseMoney(row['FRETE BRUTO ICMS']),
    frete_pis_cofins: parseMoney(row['FRETE PIS/COFINS']),
    frete_liquido_cargox: parseMoney(row['Frete Líquido CARGO X']),
    real_pallet_atual: parseMoney(row['Real Pallet ATUAL']),
    contrato_frete_gmx: parseMoney(row['CONTRATO GMX']),
    evidencia: String(row['Evidência'] ?? '').trim() || undefined,
    status_tarifa: String(row['Status Tarifa'] ?? '').trim() || undefined,
    km_rodado_terceiro: parseMoney(row['KM Rodado Terceiro']),
    frete_terceiro_padrao: parseMoney(row['Frete Terceiro Padrão']),
    frete_terceiro_maximo: parseMoney(row['Frete terceiro máximo']),
  };
}

function lerCsv(filePath) {
  const csv = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  return parsed.data;
}

async function carregarExistentes(token) {
  const { json } = await req('GET', '/items/config_rotas?limit=5000', token);
  const rows = json?.data ?? [];
  const mapa = new Map();
  for (const row of rows) {
    mapa.set(chaveRota(row), row);
  }
  return mapa;
}

async function upsertRotas(token, items) {
  const existentes = await carregarExistentes(token);
  let criados = 0;
  let atualizados = 0;

  for (const item of items) {
    if (!item.origem || !item.destino || item.valor_minimo == null || item.valor_maximo == null) continue;
    await ensureTipoOperacao(token, item.operacao);
    const key = chaveRota(item);
    const atual = existentes.get(key);
    if (atual?.id) {
      await req('PATCH', `/items/config_rotas/${atual.id}`, token, item);
      atualizados += 1;
    } else {
      const created = await req('POST', '/items/config_rotas', token, item);
      if (created.status >= 400) {
        throw new Error(`Falha ao criar rota ${item.origem} -> ${item.destino}: ${JSON.stringify(created.json)}`);
      }
      criados += 1;
    }
  }

  return { criados, atualizados };
}

async function main() {
  const token = await login();
  await ensureSchema(token);

  const arrozRows = lerCsv(path.join(EXCEL_DIR, 'Planilha sem título - ROTAS ARROZ (1).csv')).map(mapArrozRow);
  const lataRows = lerCsv(path.join(EXCEL_DIR, 'Planilha sem título - ROTAS LATA.csv')).map(mapLataRow);
  const resultado = await upsertRotas(token, [...arrozRows, ...lataRows]);

  console.log(JSON.stringify({
    ok: true,
    importadas: arrozRows.length + lataRows.length,
    ...resultado,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
