import { CalendarIcon, Factory, RotateCcw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { OperationsFilter } from '@/components/operations/OperationsFilter';

interface Props {
  timeTravelDate: Date | undefined;
  timeTravelEndDate: Date | undefined;
  onTimeTravelDate: (d: Date | undefined) => void;
  onTimeTravelEndDate: (d: Date | undefined) => void;
  selectedOperations: string[];
  onOperations: (ops: string[]) => void;
  showDisponivel: boolean;
  showRetornando: boolean;
  showCarregado: boolean;
  showSomentePrevistos: boolean;
  onShowDisponivel: (v: boolean) => void;
  onShowRetornando: (v: boolean) => void;
  onShowCarregado: (v: boolean) => void;
  onShowSomentePrevistos: (v: boolean) => void;
  originPoint: [number, number] | null;
  isSearchingFactory: boolean;
  onSearchingFactory: (v: boolean) => void;
  factoryName: string;
  onFactoryName: (v: string) => void;
  factorySearchTerm: string;
  onFactorySearchTerm: (v: string) => void;
  isSearching: boolean;
  onSearchFactory: () => void;
  radiusKm: number[];
  onRadiusKm: (v: number[]) => void;
}

export function TrackingFiltersBar({
  timeTravelDate, timeTravelEndDate, onTimeTravelDate, onTimeTravelEndDate,
  selectedOperations, onOperations,
  showDisponivel, showRetornando, showCarregado, showSomentePrevistos,
  onShowDisponivel, onShowRetornando, onShowCarregado, onShowSomentePrevistos,
  originPoint, isSearchingFactory, onSearchingFactory,
  factoryName, onFactoryName, factorySearchTerm, onFactorySearchTerm,
  isSearching, onSearchFactory, radiusKm, onRadiusKm,
}: Props) {
  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
      <CardContent className="p-5 flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtro no Tempo</Label>
            <div className="flex gap-2">
              {([{ val: timeTravelDate, set: onTimeTravelDate, label: 'Data inicial' },
                { val: timeTravelEndDate, set: onTimeTravelEndDate, label: 'Data final' }] as const).map(({ val, set, label }) => (
                <Popover key={label}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`w-[180px] justify-start text-left font-normal ${!val && 'text-muted-foreground'}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {val ? format(val, 'dd/MM/yyyy', { locale: ptBR }) : <span>{label}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                    <Calendar mode="single" selected={val} onSelect={set} initialFocus locale={ptBR} disabled={() => false} />
                  </PopoverContent>
                </Popover>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-slate-200 dark:bg-slate-700" />

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operações</Label>
            <OperationsFilter value={selectedOperations} onChange={onOperations} className="h-9" />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant={showDisponivel ? 'secondary' : 'outline'} size="sm" onClick={() => onShowDisponivel(!showDisponivel)}>Disponível</Button>
              <Button variant={showRetornando ? 'secondary' : 'outline'} size="sm" onClick={() => onShowRetornando(!showRetornando)}>Retornando</Button>
              <Button variant={showCarregado ? 'secondary' : 'outline'} size="sm" onClick={() => onShowCarregado(!showCarregado)}>Carregado</Button>
              <Button variant={showSomentePrevistos ? 'secondary' : 'outline'} size="sm" onClick={() => onShowSomentePrevistos(!showSomentePrevistos)}>Só previstos</Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ponto de Busca (Fábrica)</Label>
            <Dialog open={isSearchingFactory} onOpenChange={onSearchingFactory}>
              <DialogTrigger asChild>
                <Button variant={originPoint ? 'secondary' : 'outline'} className="w-[200px]">
                  <Factory className="mr-2 h-4 w-4 text-orange-600" />
                  {originPoint ? 'Fábrica Definida' : 'Adicionar Fábrica'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Fábrica/Empresa</DialogTitle>
                  <DialogDescription>
                    Dê um nome e informe o endereço da empresa para fixar o ponto no mapa.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome da Fábrica / Empresa</Label>
                    <Input value={factoryName} onChange={(e) => onFactoryName(e.target.value)} placeholder="Ex: Armazém Central - GMX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={factorySearchTerm}
                        onChange={(e) => onFactorySearchTerm(e.target.value)}
                        placeholder="Ex: Avenida Presidente Vargas, Rio de Janeiro"
                        onKeyDown={(e) => e.key === 'Enter' && onSearchFactory()}
                      />
                      <Button type="button" onClick={onSearchFactory} disabled={isSearching || !factorySearchTerm.trim()}>
                        {isSearching ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col gap-2 w-[220px]">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max. Distância</Label>
              <span className="text-xs font-bold text-emerald-600">{radiusKm[0]} km</span>
            </div>
            <Input
              type="number" min={10} max={800} value={radiusKm[0]}
              onChange={(e) => { const v = Number(e.target.value || 0); if (!isNaN(v) && v >= 10) onRadiusKm([Math.min(v, 800)]); }}
              className="h-8"
            />
            <Slider value={radiusKm} onValueChange={onRadiusKm} max={800} min={10} step={10} className="mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
