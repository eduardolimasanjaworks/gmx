/**
 * Utilitarios de mapeamento CSV -> campos de embarque.
 * Permite importar planilhas arbitrarias sem depender de cabecalho fixo.
 * Mantem o mapeamento explicito e deterministico antes de criar embarques.
 */
import type { CsvEmbarqueRow } from '@/lib/embarque-rota-service';

export const CSV_IGNORE = '__ignorar__';

export type EmbarqueCsvCampo =
  | 'pedido'
  | 'origem'
  | 'destino'
  | 'cliente'
  | 'tp'
  | 'produto'
  | 'operacao'
  | 'paletes'
  | 'quantidade_kg'
  | 'total_value'
  | 'tipo_veiculo'
  | 'placa_cavalo'
  | 'pickup_date'
  | 'delivery_date'
  | 'delivery_window_start'
  | 'delivery_window_end';

export interface EmbarqueCsvCampoDef {
  campo: EmbarqueCsvCampo;
  label: string;
  required?: boolean;
}

export const EMBARQUE_CSV_CAMPOS: EmbarqueCsvCampoDef[] = [
  { campo: 'origem', label: 'Origem', required: true },
  { campo: 'destino', label: 'Destino', required: true },
  { campo: 'pedido', label: 'Pedido' },
  { campo: 'cliente', label: 'Cliente' },
  { campo: 'tp', label: 'Transportadora' },
  { campo: 'produto', label: 'Produto' },
  { campo: 'operacao', label: 'Operacao' },
  { campo: 'paletes', label: 'Paletes' },
  { campo: 'quantidade_kg', label: 'Quantidade (kg)' },
  { campo: 'total_value', label: 'Valor total' },
  { campo: 'tipo_veiculo', label: 'Tipo de veiculo' },
  { campo: 'placa_cavalo', label: 'Placa do cavalo' },
  { campo: 'pickup_date', label: 'Data de coleta' },
  { campo: 'delivery_date', label: 'Data de entrega' },
  { campo: 'delivery_window_start', label: 'Janela inicio' },
  { campo: 'delivery_window_end', label: 'Janela fim' },
];

export type CsvColumnMapping = Record<EmbarqueCsvCampo, string>;

const aliases: Record<EmbarqueCsvCampo, string[]> = {
  pedido: ['pedido', 'codigo do pedido', 'codigo de pedido de insumos'],
  origem: ['origem', 'nome original', 'cidade origem'],
  destino: ['destino', 'nome do destino', 'cidade destino'],
  cliente: ['cliente', 'nome do cliente', 'embarcador'],
  tp: ['tp', 'transportadora', 'razao social'],
  produto: ['produto', 'tipo de material', 'mercadoria'],
  operacao: ['operacao', 'operação', 'cargo type', 'tipo de carga'],
  paletes: ['paletes', 'palets', 'numero de paletes', 'numero de palets'],
  quantidade_kg: ['quantidade_kg', 'peso', 'peso kg', 'quantidade'],
  total_value: ['valor', 'valor total', 'total_value', 'valor frete'],
  tipo_veiculo: ['tipo veiculo', 'tipo de veiculo', 'vehicle_type'],
  placa_cavalo: ['placa', 'placa cavalo', 'placa do cavalo'],
  pickup_date: ['pickup_date', 'data coleta', 'coleta', 'pickup date'],
  delivery_date: ['delivery_date', 'data entrega', 'entrega'],
  delivery_window_start: ['janela inicio', 'delivery_window_start', 'janela de entrega inicio'],
  delivery_window_end: ['janela fim', 'delivery_window_end', 'janela de entrega fim'],
};

function normalizar(valor: string): string {
  return String(valor)
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function valorDaColuna(row: Record<string, unknown>, column: string): string {
  const bruto = row[column];
  return bruto == null ? '' : String(bruto).trim();
}

export function inferirCsvColumnMapping(headers: string[]): CsvColumnMapping {
  const mapping = {} as CsvColumnMapping;
  const normalized = headers.map((header) => ({ original: header, normalized: normalizar(header) }));

  for (const def of EMBARQUE_CSV_CAMPOS) {
    const encontrado = normalized.find((header) =>
      aliases[def.campo].some((alias) => header.normalized === normalizar(alias)),
    );
    mapping[def.campo] = encontrado?.original ?? CSV_IGNORE;
  }

  return mapping;
}

export function mappingObrigatorioValido(mapping: CsvColumnMapping): boolean {
  return EMBARQUE_CSV_CAMPOS.filter((item) => item.required).every((item) => mapping[item.campo] !== CSV_IGNORE);
}

export function mapCsvRowsToEmbarques(
  rows: Record<string, unknown>[],
  mapping: CsvColumnMapping,
): CsvEmbarqueRow[] {
  return rows.map((row) => {
    const get = (campo: EmbarqueCsvCampo) => {
      const column = mapping[campo];
      return !column || column === CSV_IGNORE ? '' : valorDaColuna(row, column);
    };

    return {
      pedido: get('pedido') || '-',
      origem: get('origem'),
      destino: get('destino'),
      cliente: get('cliente') || undefined,
      tp: get('tp') || undefined,
      produto: get('produto') || undefined,
      operacao: get('operacao') || undefined,
      paletes: get('paletes') || undefined,
      quantidade_kg: get('quantidade_kg') || undefined,
      total_value: get('total_value') || undefined,
      tipo_veiculo: get('tipo_veiculo') || undefined,
      placa_cavalo: get('placa_cavalo') || undefined,
      pickup_date: get('pickup_date') || undefined,
      delivery_date: get('delivery_date') || undefined,
      delivery_window_start: get('delivery_window_start') || undefined,
      delivery_window_end: get('delivery_window_end') || undefined,
    };
  });
}
