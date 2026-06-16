/**
 * Cria campos de controle cadastral em cadastro_motorista no Directus.
 *
 * Uso:
 *   DIRECTUS_URL=http://host:8057 DIRECTUS_TOKEN=... node scripts/add-cadastro-motorista-control-fields.js
 */

import { createDirectus, rest, staticToken, createField, readFields, updateField } from '@directus/sdk';

const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.VITE_DIRECTUS_URL || 'http://91.99.137.101:8057';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || process.env.VITE_DIRECTUS_TOKEN || 'WcIgx0hfDqdtusOP6KOrhkP9eVPlbsOq';
const TABLE_NAME = 'cadastro_motorista';

const client = createDirectus(DIRECTUS_URL)
  .with(staticToken(DIRECTUS_TOKEN))
  .with(rest());

const FIELDS_TO_ENSURE = [
  {
    field: 'status_validade_cnh',
    type: 'string',
    meta: {
      interface: 'select-dropdown',
      display: 'labels',
      note: 'Status visual da validade da CNH (ex: CNH NO PRAZO)',
      width: 'half',
      options: {
        choices: [
          { text: 'CNH NO PRAZO', value: 'CNH NO PRAZO' },
          { text: 'CNH EXPIRADA', value: 'CNH EXPIRADA' },
          { text: 'CNH A VENCER', value: 'CNH A VENCER' },
        ],
        allowOther: true,
      },
    },
    schema: { is_nullable: true },
  },
  {
    field: 'tipo_carroceria',
    type: 'string',
    meta: {
      interface: 'select-dropdown',
      display: 'labels',
      note: 'Tipo de carroceria do veículo',
      width: 'half',
      options: {
        choices: [
          { text: 'Caçamba Graneleira', value: 'Caçamba Graneleira' },
          { text: 'Baú', value: 'Baú' },
          { text: 'Baú Roletado', value: 'Baú Roletado' },
          { text: 'Baú Lata', value: 'Baú Lata' },
          { text: 'Tanque', value: 'Tanque' },
          { text: 'Cegonha', value: 'Cegonha' },
          { text: 'Tanque Bobineira', value: 'Tanque Bobineira' },
          { text: 'Gaiola', value: 'Gaiola' },
          { text: 'Sider', value: 'Sider' },
          { text: 'Graneleiro', value: 'Graneleiro' },
        ],
        allowOther: true,
      },
    },
    schema: { is_nullable: true },
  },
];

async function ensureField(definition) {
  const existing = await client.request(readFields(TABLE_NAME));
  const found = existing.find((f) => f.field === definition.field);

  if (found) {
    console.log(`⚠️  Campo "${definition.field}" já existe (${found.type}). Atualizando meta...`);
    await client.request(updateField(TABLE_NAME, definition.field, {
      meta: { ...found.meta, ...definition.meta },
    }));
    console.log(`✅  Meta de "${definition.field}" atualizada.`);
    return;
  }

  console.log(`➕ Criando campo "${definition.field}"...`);
  await client.request(createField(TABLE_NAME, definition));
  console.log(`✅  Campo "${definition.field}" criado.`);
}

async function ensureObservacaoField() {
  const existing = await client.request(readFields(TABLE_NAME));
  const found = existing.find((f) => f.field === 'observacao');

  if (!found) {
    console.log('➕ Criando campo "observacao"...');
    await client.request(createField(TABLE_NAME, {
      field: 'observacao',
      type: 'text',
      meta: {
        interface: 'input-multiline',
        display: 'formatted-value',
        note: 'Observações livres do cadastro do motorista',
        width: 'full',
        options: { placeholder: 'Texto livre, sem limite de caracteres...' },
      },
      schema: { is_nullable: true },
    }));
    console.log('✅  Campo "observacao" criado.');
    return;
  }

  console.log('✅  Campo "observacao" já existe. Ajustando interface para textarea...');
  await client.request(updateField(TABLE_NAME, 'observacao', {
    meta: {
      ...found.meta,
      interface: 'input-multiline',
      width: 'full',
      note: 'Observações livres do cadastro do motorista',
      options: { placeholder: 'Texto livre, sem limite de caracteres...' },
    },
  }));
  console.log('✅  Campo "observacao" atualizado.');
}

async function main() {
  console.log(`Directus: ${DIRECTUS_URL}`);
  console.log(`Collection: ${TABLE_NAME}\n`);

  for (const field of FIELDS_TO_ENSURE) {
    try {
      await ensureField(field);
    } catch (error) {
      console.error(`❌ Erro em "${field.field}":`, error?.errors?.[0]?.message || error.message || error);
      process.exitCode = 1;
    }
  }

  try {
    await ensureObservacaoField();
  } catch (error) {
    console.error('❌ Erro em "observacao":', error?.errors?.[0]?.message || error.message || error);
    process.exitCode = 1;
  }

  console.log('\nConcluído.');
}

main();
