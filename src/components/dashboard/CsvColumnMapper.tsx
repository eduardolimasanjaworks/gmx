/**
 * Formulario de mapeamento de colunas CSV para embarques.
 * Deixa o usuario escolher explicitamente qual cabecalho alimenta cada campo.
 * Mostra amostra curta para reduzir erro antes da importacao.
 */
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CSV_IGNORE,
  EMBARQUE_CSV_CAMPOS,
  type CsvColumnMapping,
  type EmbarqueCsvCampo,
} from '@/lib/csvEmbarqueMapping';

interface Props {
  headers: string[];
  previewRows: Record<string, unknown>[];
  mapping: CsvColumnMapping;
  onChange: (campo: EmbarqueCsvCampo, coluna: string) => void;
}

function valorPreview(row: Record<string, unknown>, coluna: string): string {
  const bruto = row[coluna];
  if (bruto == null) return '—';
  const texto = String(bruto).trim();
  return texto || '—';
}

export function CsvColumnMapper({ headers, previewRows, mapping, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Mapeie ao menos <strong>Origem</strong> e <strong>Destino</strong>. Os demais campos sao opcionais.
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {EMBARQUE_CSV_CAMPOS.map((campo) => (
          <div key={campo.campo} className="space-y-1.5 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">{campo.label}</Label>
              {campo.required && <Badge variant="destructive">Obrigatorio</Badge>}
            </div>
            <Select value={mapping[campo.campo]} onValueChange={(value) => onChange(campo.campo, value)}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma coluna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CSV_IGNORE}>Ignorar campo</SelectItem>
                {headers.map((header) => (
                  <SelectItem key={`${campo.campo}-${header}`} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mapping[campo.campo] !== CSV_IGNORE && previewRows.length > 0 && (
              <div className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                Ex.: {valorPreview(previewRows[0], mapping[campo.campo])}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
