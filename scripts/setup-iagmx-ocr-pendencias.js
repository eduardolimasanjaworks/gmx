/**
 * Cria as colecoes que recebem arquivos originais do WhatsApp e sugestoes OCR pendentes.
 * Mantem o Directus pronto para a IA sugerir sem sobrescrever cadastro automaticamente.
 * Uso: node scripts/setup-iagmx-ocr-pendencias.js
 */
import { createCollection, createDirectus, createField, readCollections, readFields, rest, staticToken } from '@directus/sdk';

const BASE = (process.env.VITE_DIRECTUS_URL || 'https://gmx.sanjaworks.com/api').replace(/\/$/, '');
const TOKEN = (process.env.VITE_DIRECTUS_TOKEN || '').replace(/^"|"$/g, '');

const client = createDirectus(BASE).with(staticToken(TOKEN)).with(rest());

const DEFINICOES = [
  {
    collection: 'motorista_arquivo_original',
    note: 'Arquivos originais enviados pelo motorista via WhatsApp e capturados pela IA',
    fields: [
      ['motorista_id', 'string', 'input'],
      ['telefone', 'string', 'input'],
      ['tipo_documento', 'string', 'input'],
      ['origem', 'string', 'input'],
      ['nome_arquivo', 'string', 'input'],
      ['mime_type', 'string', 'input'],
      ['tamanho_bytes', 'integer', 'numeric'],
      ['asset_id', 'string', 'input'],
      ['link', 'string', 'input'],
      ['midia_id', 'string', 'input'],
      ['texto_ocr', 'text', 'input-multiline'],
      ['campos_extraidos', 'text', 'input-multiline'],
      ['status', 'string', 'input'],
    ],
  },
  {
    collection: 'motorista_ocr_sugestao',
    note: 'Sugestoes da IA para preencher campos do motorista ou documento, sempre pendentes de aceite humano',
    fields: [
      ['motorista_id', 'string', 'input'],
      ['telefone', 'string', 'input'],
      ['tipo_documento', 'string', 'input'],
      ['colecao_destino', 'string', 'input'],
      ['arquivo_original_id', 'integer', 'numeric'],
      ['asset_id', 'string', 'input'],
      ['link', 'string', 'input'],
      ['status', 'string', 'input'],
      ['sugestao_documento', 'text', 'input-multiline'],
      ['sugestao_motorista', 'text', 'input-multiline'],
      ['campos_extraidos', 'text', 'input-multiline'],
      ['texto_ocr', 'text', 'input-multiline'],
      ['observacao', 'text', 'input-multiline'],
      ['aplicada_em', 'string', 'input'],
      ['rejeitada_em', 'string', 'input'],
      ['revisada_em', 'string', 'input'],
      ['revisada_por_id', 'string', 'input'],
      ['revisada_por_nome', 'string', 'input'],
      ['revisada_por_email', 'string', 'input'],
      ['campos_aplicados', 'text', 'input-multiline'],
      ['campos_rejeitados', 'text', 'input-multiline'],
    ],
  },
];

async function listarColecoes() {
  const colecoes = await client.request(readCollections());
  return new Set((colecoes || []).map((item) => item.collection));
}

async function listarCampos(collection) {
  const fields = await client.request(readFields(collection));
  return new Set((fields || []).map((item) => item.field));
}

async function garantirColecao(def) {
  const existentes = await listarColecoes();
  if (!existentes.has(def.collection)) {
    await client.request(createCollection({
      collection: def.collection,
      schema: { name: def.collection },
      meta: {
        singleton: false,
        sort_field: 'date_created',
        note: def.note,
      },
    }));
    console.log(`+ colecao criada: ${def.collection}`);
  } else {
    console.log(`= colecao ja existe: ${def.collection}`);
  }
}

async function garantirCampo(collection, field, type, iface) {
  const existentes = await listarCampos(collection);
  if (existentes.has(field)) {
    console.log(`= campo ja existe: ${collection}.${field}`);
    return;
  }
  await client.request(createField(collection, {
    field,
    type,
    meta: {
      interface: iface,
      display_name: field.replace(/_/g, ' '),
    },
  }));
  console.log(`+ campo criado: ${collection}.${field}`);
}

async function main() {
  if (!TOKEN) throw new Error('VITE_DIRECTUS_TOKEN ausente');
  for (const def of DEFINICOES) {
    await garantirColecao(def);
    for (const [field, type, iface] of def.fields) {
      await garantirCampo(def.collection, field, type, iface);
    }
  }
  console.log('ok: colecoes de OCR pendente prontas');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
