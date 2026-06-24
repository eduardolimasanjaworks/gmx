import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  EMPTY_REGRAS_DRAFT,
  RotaOperationalRulesCard,
  type RotaRegrasDraft,
  regrasDraftFromEvidence,
  resumoRegrasRota,
  rulesDraftToEvidence,
} from '@/components/dashboard/RotaOperationalRulesCard';
import { useConfigRotas, type ConfigRota, type ConfigRotaInput } from '@/hooks/useConfigRotas';
import { useTiposOperacao } from '@/hooks/useTiposOperacao';
import { OperationsFilter } from '@/components/operations/OperationsFilter';
import { ChevronDown, Loader2, MapPinned, Pencil, Plus, Save, Settings, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

type DraftRota = {
  origem: string;
  destino: string;
  origem_latitude: string;
  origem_longitude: string;
  destino_latitude: string;
  destino_longitude: string;
  operacao: string;
  valor_minimo: string;
  valor_maximo: string;
  ativo: boolean;
  fonte_planilha: string;
  especie_produto: string;
  origem_regiao: string;
  uf_origem: string;
  uf_destino: string;
  capacidade: string;
  distancia_km: string;
  frete_peso_cargox: string;
  frete_bruto_icms: string;
  frete_pis_cofins: string;
  frete_liquido_cargox: string;
  contrato_frete_gmx: string;
  frete_peso_terceiro: string;
  total_terceiro: string;
  km_rodado_frete_atual: string;
  icms: string;
  real_pallet_atual: string;
  evidencia: string;
  status_tarifa: string;
  km_rodado_terceiro: string;
  frete_terceiro_padrao: string;
  frete_terceiro_maximo: string;
};

type BaseDraftKey =
  | 'origem'
  | 'destino'
  | 'origem_latitude'
  | 'origem_longitude'
  | 'destino_latitude'
  | 'destino_longitude'
  | 'operacao'
  | 'valor_minimo'
  | 'valor_maximo';

type OptionalFieldKey = Exclude<keyof DraftRota, BaseDraftKey | 'ativo'>;
type InputDraftKey = Exclude<keyof DraftRota, 'ativo'>;

type FieldDef = {
  key: InputDraftKey;
  label: string;
  type: 'text' | 'number';
};

const OPTIONAL_FIELD_DEFS: Array<{
  key: OptionalFieldKey;
  label: string;
  type: 'text' | 'number';
}> = [
  { key: 'especie_produto', label: 'Especie / produto', type: 'text' },
  { key: 'origem_regiao', label: 'Origem regiao', type: 'text' },
  { key: 'uf_origem', label: 'UF origem', type: 'text' },
  { key: 'uf_destino', label: 'UF destino', type: 'text' },
  { key: 'capacidade', label: 'Capacidade', type: 'text' },
  { key: 'distancia_km', label: 'Distancia km', type: 'number' },
  { key: 'frete_peso_cargox', label: 'Frete peso Cargox', type: 'number' },
  { key: 'frete_bruto_icms', label: 'Frete bruto ICMS', type: 'number' },
  { key: 'frete_pis_cofins', label: 'Frete PIS/COFINS', type: 'number' },
  { key: 'frete_liquido_cargox', label: 'Frete liquido Cargox', type: 'number' },
  { key: 'contrato_frete_gmx', label: 'Contrato frete GMX', type: 'number' },
  { key: 'frete_peso_terceiro', label: 'Frete peso terceiro', type: 'number' },
  { key: 'total_terceiro', label: 'Total terceiro', type: 'number' },
  { key: 'km_rodado_frete_atual', label: 'Km rodado frete atual', type: 'number' },
  { key: 'icms', label: 'ICMS', type: 'text' },
  { key: 'real_pallet_atual', label: 'Real pallet atual', type: 'number' },
  { key: 'evidencia', label: 'Evidencia', type: 'text' },
  { key: 'status_tarifa', label: 'Status tarifa', type: 'text' },
  { key: 'km_rodado_terceiro', label: 'Km rodado terceiro', type: 'number' },
  { key: 'frete_terceiro_padrao', label: 'Frete terceiro padrao', type: 'number' },
  { key: 'frete_terceiro_maximo', label: 'Frete terceiro maximo', type: 'number' },
];

const ROUTE_COLUMNS_STORAGE_KEY = 'gmx_route_table_columns_v1';
const DEFAULT_VISIBLE_OPTIONAL_COLUMNS: OptionalFieldKey[] = [
  'capacidade',
  'distancia_km',
  'uf_origem',
  'uf_destino',
];

const EMPTY_DRAFT: DraftRota = {
  origem: '',
  destino: '',
  origem_latitude: '',
  origem_longitude: '',
  destino_latitude: '',
  destino_longitude: '',
  operacao: '',
  valor_minimo: '',
  valor_maximo: '',
  ativo: true,
  fonte_planilha: '',
  especie_produto: '',
  origem_regiao: '',
  uf_origem: '',
  uf_destino: '',
  capacidade: '',
  distancia_km: '',
  frete_peso_cargox: '',
  frete_bruto_icms: '',
  frete_pis_cofins: '',
  frete_liquido_cargox: '',
  contrato_frete_gmx: '',
  frete_peso_terceiro: '',
  total_terceiro: '',
  km_rodado_frete_atual: '',
  icms: '',
  real_pallet_atual: '',
  evidencia: '',
  status_tarifa: '',
  km_rodado_terceiro: '',
  frete_terceiro_padrao: '',
  frete_terceiro_maximo: '',
};

function toDraft(rota: ConfigRota): DraftRota {
  return {
    origem: rota.origem ?? '',
    destino: rota.destino ?? '',
    origem_latitude: String(rota.origem_latitude ?? ''),
    origem_longitude: String(rota.origem_longitude ?? ''),
    destino_latitude: String(rota.destino_latitude ?? ''),
    destino_longitude: String(rota.destino_longitude ?? ''),
    operacao: rota.operacao ?? '',
    valor_minimo: String(rota.valor_minimo ?? ''),
    valor_maximo: String(rota.valor_maximo ?? ''),
    ativo: rota.ativo !== false,
    fonte_planilha: rota.fonte_planilha ?? '',
    especie_produto: rota.especie_produto ?? '',
    origem_regiao: rota.origem_regiao ?? '',
    uf_origem: rota.uf_origem ?? '',
    uf_destino: rota.uf_destino ?? '',
    capacidade: rota.capacidade ?? '',
    distancia_km: String(rota.distancia_km ?? ''),
    frete_peso_cargox: String(rota.frete_peso_cargox ?? ''),
    frete_bruto_icms: String(rota.frete_bruto_icms ?? ''),
    frete_pis_cofins: String(rota.frete_pis_cofins ?? ''),
    frete_liquido_cargox: String(rota.frete_liquido_cargox ?? ''),
    contrato_frete_gmx: String(rota.contrato_frete_gmx ?? ''),
    frete_peso_terceiro: String(rota.frete_peso_terceiro ?? ''),
    total_terceiro: String(rota.total_terceiro ?? ''),
    km_rodado_frete_atual: String(rota.km_rodado_frete_atual ?? ''),
    icms: rota.icms ?? '',
    real_pallet_atual: String(rota.real_pallet_atual ?? ''),
    evidencia: rota.evidencia ?? '',
    status_tarifa: rota.status_tarifa ?? '',
    km_rodado_terceiro: String(rota.km_rodado_terceiro ?? ''),
    frete_terceiro_padrao: String(rota.frete_terceiro_padrao ?? ''),
    frete_terceiro_maximo: String(rota.frete_terceiro_maximo ?? ''),
  };
}

function moeda(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function parseOptionalNumber(value: string): number | undefined {
  const limpo = value.trim();
  if (!limpo) return undefined;
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : undefined;
}

function formatarNumero(
  value: number | string | null | undefined,
  maximumFractionDigits = 2,
): string {
  if (value == null || value === '') return '—';
  const numero = Number(value);
  if (!Number.isFinite(numero)) return String(value);
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function carregarColunasOpcionaisVisiveis(): OptionalFieldKey[] {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
  try {
    const raw = window.localStorage.getItem(ROUTE_COLUMNS_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
    const validas = parsed.filter((item): item is OptionalFieldKey =>
      OPTIONAL_FIELD_DEFS.some((field) => field.key === item),
    );
    return validas.length ? validas : DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_OPTIONAL_COLUMNS;
  }
}

function montarPayload(draft: DraftRota): ConfigRotaInput {
  const payload: ConfigRotaInput = {
    origem: draft.origem.trim(),
    destino: draft.destino.trim(),
    origem_latitude: parseOptionalNumber(draft.origem_latitude),
    origem_longitude: parseOptionalNumber(draft.origem_longitude),
    destino_latitude: parseOptionalNumber(draft.destino_latitude),
    destino_longitude: parseOptionalNumber(draft.destino_longitude),
    operacao: draft.operacao.trim() || undefined,
    valor_minimo: Number(draft.valor_minimo),
    valor_maximo: Number(draft.valor_maximo),
    ativo: draft.ativo,
  };

  for (const field of OPTIONAL_FIELD_DEFS) {
    const bruto = draft[field.key];
    if (field.type === 'number') {
      (payload as Record<string, unknown>)[field.key] = parseOptionalNumber(bruto);
    } else {
      (payload as Record<string, unknown>)[field.key] = bruto.trim() || undefined;
    }
  }

  return payload;
}

export function RotasCrudPanel() {
  const { rotas, isLoading, createRota, updateRota, deleteRota } = useConfigRotas();
  const { tipos } = useTiposOperacao();
  const [novo, setNovo] = useState<DraftRota>(EMPTY_DRAFT);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [edicao, setEdicao] = useState<DraftRota>(EMPTY_DRAFT);
  const [novoRegras, setNovoRegras] = useState<RotaRegrasDraft>(EMPTY_REGRAS_DRAFT);
  const [edicaoRegras, setEdicaoRegras] = useState<RotaRegrasDraft>(EMPTY_REGRAS_DRAFT);
  const [salvando, setSalvando] = useState<'novo' | number | null>(null);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [visibleOptionalColumns, setVisibleOptionalColumns] = useState<OptionalFieldKey[]>(
    carregarColunasOpcionaisVisiveis,
  );

  const operacoes = useMemo(
    () => tipos.map((tipo) => tipo.nome).filter(Boolean),
    [tipos],
  );

  const visibleOptionalDefs = useMemo(
    () => OPTIONAL_FIELD_DEFS.filter((field) => visibleOptionalColumns.includes(field.key)),
    [visibleOptionalColumns],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROUTE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleOptionalColumns));
  }, [visibleOptionalColumns]);

  const rotasFiltradas = useMemo(() => {
    if (!selectedOperations.length) return rotas;
    const filtro = new Set(selectedOperations.map((item) => item.trim().toUpperCase()));
    return rotas.filter((rota) => {
      const operacao = String(rota.operacao ?? '').trim().toUpperCase();
      return operacao ? filtro.has(operacao) : false;
    });
  }, [rotas, selectedOperations]);

  const validarParCoordenadas = (
    draft: DraftRota,
    latKey: 'origem_latitude' | 'destino_latitude',
    lngKey: 'origem_longitude' | 'destino_longitude',
    label: string,
  ) => {
    const lat = draft[latKey].trim();
    const lng = draft[lngKey].trim();
    if (!lat && !lng) return true;
    if (!lat || !lng) {
      toast.error(`${label}: informe latitude e longitude juntas`);
      return false;
    }
    const latNum = parseOptionalNumber(lat);
    const lngNum = parseOptionalNumber(lng);
    if (latNum == null || lngNum == null) {
      toast.error(`${label}: coordenadas invalidas`);
      return false;
    }
    if (latNum < -90 || latNum > 90) {
      toast.error(`${label}: latitude fora do intervalo valido`);
      return false;
    }
    if (lngNum < -180 || lngNum > 180) {
      toast.error(`${label}: longitude fora do intervalo valido`);
      return false;
    }
    return true;
  };

  const validar = (draft: DraftRota) => {
    if (!draft.origem.trim() || !draft.destino.trim()) {
      toast.error('Informe origem e destino');
      return false;
    }
    if (!draft.valor_minimo.trim() || !draft.valor_maximo.trim()) {
      toast.error('Informe valor minimo e valor maximo');
      return false;
    }
    const minimo = Number(draft.valor_minimo);
    const maximo = Number(draft.valor_maximo);
    if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) {
      toast.error('Valores minimo e maximo precisam ser numericos');
      return false;
    }
    if (minimo > maximo) {
      toast.error('O valor minimo nao pode ser maior que o valor maximo');
      return false;
    }
    if (!validarParCoordenadas(draft, 'origem_latitude', 'origem_longitude', 'Origem')) return false;
    if (!validarParCoordenadas(draft, 'destino_latitude', 'destino_longitude', 'Destino')) return false;
    return true;
  };

  const salvarNova = async () => {
    if (!validar(novo)) return;
    setSalvando('novo');
    try {
      await createRota({
        ...montarPayload(novo),
        evidencia: rulesDraftToEvidence(novoRegras),
      });
      setNovo(EMPTY_DRAFT);
      setNovoRegras(EMPTY_REGRAS_DRAFT);
    } finally {
      setSalvando(null);
    }
  };

  const iniciarEdicao = (rota: ConfigRota) => {
    setEditandoId(rota.id);
    setEdicao(toDraft(rota));
    setEdicaoRegras(regrasDraftFromEvidence(rota.evidencia));
  };

  const salvarEdicao = async (id: number) => {
    if (!validar(edicao)) return;
    setSalvando(id);
    try {
      await updateRota(id, {
        ...montarPayload(edicao),
        evidencia: rulesDraftToEvidence(edicaoRegras),
      });
      setEditandoId(null);
      setEdicao(EMPTY_DRAFT);
      setEdicaoRegras(EMPTY_REGRAS_DRAFT);
    } finally {
      setSalvando(null);
    }
  };

  const renderInput = (
    draft: DraftRota,
    setDraft: Dispatch<SetStateAction<DraftRota>>,
    key: InputDraftKey,
    type: string = 'text',
  ) => (
    <Input
      type={type}
      value={draft[key]}
      onChange={(e) => setDraft((s) => ({ ...s, [key]: e.target.value }))}
    />
  );

  const renderCellValue = (rota: ConfigRota, field: FieldDef) => {
    if (field.key === 'valor_minimo') return moeda(rota.valor_minimo);
    if (field.key === 'valor_maximo') return moeda(rota.valor_maximo);
    if (
      field.key === 'origem_latitude' ||
      field.key === 'origem_longitude' ||
      field.key === 'destino_latitude' ||
      field.key === 'destino_longitude'
    ) {
      return formatarNumero(rota[field.key], 6);
    }
    if (field.type === 'number') return formatarNumero(rota[field.key], 2);
    return String(rota[field.key] ?? '—') || '—';
  };

  const toggleOptionalColumn = (key: OptionalFieldKey, checked: boolean) => {
    setVisibleOptionalColumns((prev) => {
      if (checked) {
        return OPTIONAL_FIELD_DEFS.filter((field) => field.key === key || prev.includes(field.key)).map((field) => field.key);
      }
      return prev.filter((item) => item !== key);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPinned className="h-4 w-4" />
                Cadastro de rotas
              </CardTitle>
              <CardDescription>
                As coordenadas de origem e destino ficam explicitas para permitir o calculo real da distancia entre o GPS do motorista e a origem da rota.
              </CardDescription>
            </div>
            <Badge variant="outline">4 colunas fixas de coordenadas</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Badge>Campos base</Badge>
              <span className="text-xs text-muted-foreground">Coordenadas de origem e destino entram na leitura operacional da rota</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Origem</label>
                {renderInput(novo, setNovo, 'origem')}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Origem latitude</label>
                {renderInput(novo, setNovo, 'origem_latitude', 'number')}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Origem longitude</label>
                {renderInput(novo, setNovo, 'origem_longitude', 'number')}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Destino</label>
                {renderInput(novo, setNovo, 'destino')}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Destino latitude</label>
                {renderInput(novo, setNovo, 'destino_latitude', 'number')}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Destino longitude</label>
                {renderInput(novo, setNovo, 'destino_longitude', 'number')}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Operacao</label>
                <Input
                  list="operacoes-rotas"
                  value={novo.operacao}
                  onChange={(e) => setNovo((s) => ({ ...s, operacao: e.target.value }))}
                />
                <datalist id="operacoes-rotas">
                  {operacoes.map((operacao) => (
                    <option key={operacao} value={operacao} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Valor minimo</label>
                {renderInput(novo, setNovo, 'valor_minimo', 'number')}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Valor maximo</label>
                {renderInput(novo, setNovo, 'valor_maximo', 'number')}
              </div>
            </div>
          </div>

          <Collapsible className="rounded-lg border">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
              <span>Campos adicionais da rota</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {OPTIONAL_FIELD_DEFS.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                    {renderInput(novo, setNovo, field.key, field.type)}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <RotaOperationalRulesCard
            draft={novoRegras}
            onChange={setNovoRegras}
            description="A equipe define se o ranking prioriza o agora ou a data de coleta, qual a tolerância do GPS e como a negociação sobe antes de escalar."
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={novo.ativo}
                onChange={(e) => setNovo((s) => ({ ...s, ativo: e.target.checked }))}
              />
              Rota ativa
            </label>
            <Button onClick={salvarNova} disabled={salvando === 'novo'} className="gap-2">
              {salvando === 'novo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar rota
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Rotas cadastradas</CardTitle>
            <p className="text-sm text-muted-foreground">
              As 4 colunas de latitude e longitude ficam sempre visiveis. Os demais campos entram pelo padrao de Configurar Campos.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <OperationsFilter
              value={selectedOperations}
              onChange={setSelectedOperations}
              className="w-full md:w-[260px]"
            />
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Configurar Campos
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Configurar campos visiveis da tabela</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 md:grid-cols-2">
                  {OPTIONAL_FIELD_DEFS.map((field) => {
                    const checked = visibleOptionalColumns.includes(field.key);
                    return (
                      <label
                        key={field.key}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium">{field.label}</div>
                          <div className="text-xs text-muted-foreground">
                            Campo adicional exibido como coluna individual
                          </div>
                        </div>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleOptionalColumn(field.key, Boolean(value))}
                        />
                      </label>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando rotas...
            </div>
          ) : !rotasFiltradas.length ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma rota encontrada para o filtro atual
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="py-2 pr-3 font-semibold text-foreground">Origem</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">Origem lat</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">Origem long</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">Destino</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">Destino lat</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">Destino long</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">Operacao</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">Min</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">Max</th>
                    {visibleOptionalDefs.map((field) => (
                      <th key={field.key} className="py-2 pr-3 font-semibold text-foreground">
                        {field.label}
                      </th>
                    ))}
                    <th className="py-2 pr-3 font-semibold text-foreground">Regras</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">Status</th>
                    <th className="py-2 pr-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {rotasFiltradas.map((rota) => {
                    const isEditing = editandoId === rota.id;
                    return (
                      <>
                        <tr key={rota.id} className="border-b align-top">
                          <td className="py-3 pr-3">
                            {isEditing ? renderInput(edicao, setEdicao, 'origem') : <span className="font-medium">{rota.origem}</span>}
                          </td>
                          <td className="py-3 pr-3">
                            {isEditing ? renderInput(edicao, setEdicao, 'origem_latitude', 'number') : (
                              <span className="font-mono text-xs">{formatarNumero(rota.origem_latitude, 6)}</span>
                            )}
                          </td>
                          <td className="py-3 pr-3">
                            {isEditing ? renderInput(edicao, setEdicao, 'origem_longitude', 'number') : (
                              <span className="font-mono text-xs">{formatarNumero(rota.origem_longitude, 6)}</span>
                            )}
                          </td>
                          <td className="py-3 pr-3">
                            {isEditing ? renderInput(edicao, setEdicao, 'destino') : <span className="font-medium">{rota.destino}</span>}
                          </td>
                          <td className="py-3 pr-3">
                            {isEditing ? renderInput(edicao, setEdicao, 'destino_latitude', 'number') : (
                              <span className="font-mono text-xs">{formatarNumero(rota.destino_latitude, 6)}</span>
                            )}
                          </td>
                          <td className="py-3 pr-3">
                            {isEditing ? renderInput(edicao, setEdicao, 'destino_longitude', 'number') : (
                              <span className="font-mono text-xs">{formatarNumero(rota.destino_longitude, 6)}</span>
                            )}
                          </td>
                          <td className="py-3 pr-3">
                            {isEditing ? (
                              <Input
                                list={`operacoes-rotas-edit-${rota.id}`}
                                value={edicao.operacao}
                                onChange={(e) => setEdicao((s) => ({ ...s, operacao: e.target.value }))}
                              />
                            ) : (
                              rota.operacao || '—'
                            )}
                            <datalist id={`operacoes-rotas-edit-${rota.id}`}>
                              {operacoes.map((operacao) => (
                                <option key={operacao} value={operacao} />
                              ))}
                            </datalist>
                          </td>
                          <td className="py-3 pr-3">
                            {isEditing ? renderInput(edicao, setEdicao, 'valor_minimo', 'number') : moeda(rota.valor_minimo)}
                          </td>
                          <td className="py-3 pr-3">
                            {isEditing ? renderInput(edicao, setEdicao, 'valor_maximo', 'number') : moeda(rota.valor_maximo)}
                          </td>
                          {visibleOptionalDefs.map((field) => (
                            <td key={`${rota.id}-${field.key}`} className="py-3 pr-3">
                              {isEditing
                                ? renderInput(edicao, setEdicao, field.key, field.type)
                                : renderCellValue(rota, field)}
                            </td>
                          ))}
                          <td className="py-3 pr-3">
                            <div className="max-w-[250px] text-xs text-muted-foreground leading-relaxed">
                              {resumoRegrasRota(rota.evidencia)}
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            {isEditing ? (
                              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={edicao.ativo}
                                  onChange={(e) => setEdicao((s) => ({ ...s, ativo: e.target.checked }))}
                                />
                                Ativa
                              </label>
                            ) : (
                              <Badge variant={rota.ativo === false ? 'secondary' : 'default'}>
                                {rota.ativo === false ? 'Inativa' : 'Ativa'}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => void salvarEdicao(rota.id)}
                                    disabled={salvando === rota.id}
                                    className="gap-1"
                                  >
                                    {salvando === rota.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Salvar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditandoId(null);
                                      setEdicao(EMPTY_DRAFT);
                                      setEdicaoRegras(EMPTY_REGRAS_DRAFT);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => iniciarEdicao(rota)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => void deleteRota(rota.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isEditing ? (
                          <tr className="border-b bg-muted/20">
                            <td colSpan={12 + visibleOptionalDefs.length} className="px-3 py-3">
                              <RotaOperationalRulesCard
                                title={`Regras da rota #${rota.id}`}
                                description="Essas regras entram no ranking e também na negociação automática da oferta."
                                draft={edicaoRegras}
                                onChange={setEdicaoRegras}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
