import { Clock, Crosshair, MapPin, Truck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  coordenadasMotorista,
  extrairOperacoesDriver,
  getDistanceFromLatLonInKm,
  getSynergyScore,
  localLiberacaoPrevista,
  normalizarTexto,
} from './tracking-geo-utils';

interface Props {
  allAvailableDrivers: unknown[];
  selectedDriver: unknown;
  originPoint: [number, number] | null;
  timeTravelDate: Date | undefined;
  dataFiltroReferencia: Date;
  onDriverSelect: (driver: unknown) => void;
}

export function TrackingDriversList({
  allAvailableDrivers, selectedDriver, originPoint, timeTravelDate,
  dataFiltroReferencia, onDriverSelect,
}: Props) {
  return (
    <Card className="flex flex-col h-[calc(600px+63px)] border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            {originPoint ? 'Motoristas no Raio' : 'Motoristas no Mapa'}
          </CardTitle>
          <Badge variant="outline">{allAvailableDrivers.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 overflow-y-auto grow space-y-3 bg-slate-50/30 dark:bg-slate-950/30">
        {allAvailableDrivers.map((driver: unknown) => {
          const d = driver as Record<string, unknown>;
          const motorista = d?.motorista_id as Record<string, unknown> | undefined;
          const hasGps = Boolean(coordenadasMotorista(driver, dataFiltroReferencia));
          const operacoes = extrairOperacoesDriver(driver);
          const status = normalizarTexto(d?.status);
          const liberacao = localLiberacaoPrevista(driver);
          const isFuture = d.data_previsao_disponibilidade && new Date(String(d.data_previsao_disponibilidade)) > new Date();
          const synergy = getSynergyScore(driver, originPoint, timeTravelDate);
          const sel = (selectedDriver as Record<string, unknown>)?.id;

          let distLabel = '';
          if (originPoint && hasGps) {
            const coords = coordenadasMotorista(driver, dataFiltroReferencia);
            if (coords) {
              const dist = getDistanceFromLatLonInKm(originPoint[0], originPoint[1], coords[0], coords[1]);
              distLabel = `${Math.round(dist)} km`;
            }
          }

          return (
            <div
              key={String(d.id)}
              className={`p-3 border rounded-xl bg-white dark:bg-slate-950 cursor-pointer transition-all ${
                sel === d.id
                  ? 'border-primary shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
              } ${!hasGps ? 'opacity-60' : ''}`}
              onClick={() => hasGps ? onDriverSelect(driver) : undefined}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Truck className={`h-4 w-4 ${sel === d.id ? 'text-primary' : 'text-slate-400'}`} />
                  <span className="font-bold text-sm text-foreground">
                    {String(motorista?.nome ?? '')} {String(motorista?.sobrenome ?? '')}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {synergy && (
                    <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 ${synergy.bg} ${synergy.text} ${synergy.border}`}>
                      {synergy.icon} {synergy.label}
                    </Badge>
                  )}
                  {isFuture && (
                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 border-indigo-200">
                      Previsão
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                    {status || 'disponivel'}
                  </Badge>
                  {!hasGps && (
                    <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 uppercase tracking-wider">Sem GPS preciso</Badge>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2 mt-3">
                {operacoes.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {operacoes.slice(0, 2).join(' · ')}
                    </Badge>
                    {operacoes.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{operacoes.length - 2}</span>
                    )}
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                  <div className="flex flex-col">
                    <p className="line-clamp-2 leading-relaxed">
                      {String(d.localizacao_atual || 'Local desconhecido')}
                    </p>
                    {isFuture && liberacao && (
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 flex items-center gap-1">
                        ↳ Ficará livre em: {liberacao}
                      </p>
                    )}
                    {(d.local_destino_atual || liberacao) && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        {isFuture
                          ? `Informou futura liberação para ${liberacao}.`
                          : `Destino atual: ${d.local_destino_atual || 'não informado'} · liberação: ${liberacao || 'não informada'}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-medium text-[10px] text-slate-500">
                    <Clock className="h-3 w-3" />
                    {new Date(String(d.date_updated || d.date_created)).toLocaleString()}
                  </div>
                  {distLabel && (
                    <div className="font-bold text-primary flex items-center gap-1">
                      <Crosshair className="h-3 w-3" />
                      {distLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {allAvailableDrivers.length === 0 && (
          <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
              <XCircle className="h-6 w-6 text-slate-400" />
            </div>
            <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">Nenhum veículo encontrado</p>
            <p className="text-xs mt-1 text-slate-500">Ajuste os filtros de data ou aumente o raio de busca.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
