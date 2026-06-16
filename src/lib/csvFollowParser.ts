/**
 * Parser compartilhado CSV → linhas follow/embarque.
 */
import type { CsvEmbarqueRow } from '@/lib/embarque-rota-service';

const norm = (s: string) =>
  s
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

function get(row: Record<string, unknown>, ...keys: string[]): string {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [norm(k), v]),
  );
  for (const key of keys) {
    const val = normalized[norm(key)];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

/** Converte linhas PapaParse em payload follow ou embarque */
export function parseCsvRows(rows: Record<string, unknown>[]): CsvEmbarqueRow[] {
  return rows.map((row) => {
    const ped = get(
      row,
      'Código de pedido de insumos',
      'código de pedido de insumos',
      'codigo de pedido de insumos',
      'pedido',
    );
    return {
      pedido: ped || '-',
      origem: get(row, 'nome original', 'Nome original', 'Origem', 'origem'),
      destino: get(row, 'nome do destino', 'Destino', 'destino'),
      uf: get(row, 'UF', 'uf'),
      cliente: get(row, 'Cliente', 'cliente', 'nome do cliente'),
      tp: get(row, 'razao social', 'razão social', 'TP', 'tp', 'Transportadora'),
      produto: get(row, 'tipo de material', 'Produto', 'produto'),
      paletes: get(
        row,
        'numero de paletes',
        'número de paletes',
        'numero de palets',
        'paletes',
        'Paletes',
      ),
    };
  });
}

export function csvRowsToFollowPayload(rows: CsvEmbarqueRow[]): Record<string, unknown>[] {
  return rows.map((row) => ({
    status: 'novo',
    pedido: row.pedido || '-',
    origem: row.origem,
    destino: row.destino,
    uf: row.uf,
    cliente: row.cliente,
    tp: row.tp,
    produto: row.produto,
    paletes: row.paletes,
  }));
}
