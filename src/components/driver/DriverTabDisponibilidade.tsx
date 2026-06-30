import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, X, Save, Loader2, Search, Truck } from 'lucide-react';
import { FieldRow, InputField, formatDate } from './driver-utils';
import type { DriverRelatedData } from './useDriverProfileData';

interface Props {
  data: DriverRelatedData;
  isEditingAvailability: boolean;
  editFormData: Record<string, unknown>;
  setEditFormData: (d: Record<string, unknown>) => void;
  isGeocoding: boolean;
  loading: boolean;
  onEdit: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onGeocode: () => Promise<void>;
}

export function DriverTabDisponibilidade({
  data, isEditingAvailability, editFormData, setEditFormData,
  isGeocoding, loading, onEdit, onSave, onCancel, onGeocode,
}: Props) {
  return (
    <TabsContent value="disponibilidade" className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-blue-600" /> Disponibilidade (Logística)</div>
            {!isEditingAvailability ? (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" /> {data.disponivel ? 'Atualizar' : 'Adicionar'}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
                <Button size="sm" onClick={onSave} disabled={loading}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {isEditingAvailability ? (
            <>
              <div className="flex flex-col space-y-1.5">
                <span className="text-sm text-muted-foreground">Status</span>
                <Select value={String(editFormData.status || '')} onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent position="popper" className="z-[9999]">
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="retornando">Retornando</SelectItem>
                    <SelectItem value="carregado">Carregado</SelectItem>
                    <SelectItem value="indisponivel">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1.5">
                <span className="text-sm text-muted-foreground flex justify-between items-center">
                  Localização (Extenso)
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 py-0" onClick={onGeocode} disabled={isGeocoding} type="button">
                    {isGeocoding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1 text-blue-500" />}
                    GPS Auto
                  </Button>
                </span>
                <Input value={String(editFormData.localizacao_atual || '')} placeholder="Ex: São Paulo, SP"
                  onChange={(e) => setEditFormData({ ...editFormData, localizacao_atual: e.target.value })} />
              </div>
              <InputField label="Latitude" value={editFormData.latitude} onChange={(v) => setEditFormData({ ...editFormData, latitude: v })} />
              <InputField label="Longitude" value={editFormData.longitude} onChange={(v) => setEditFormData({ ...editFormData, longitude: v })} />
              <div className="flex flex-col space-y-1.5">
                <span className="text-sm text-muted-foreground">Destino da viagem atual</span>
                <Input value={String(editFormData.local_destino_atual || '')} placeholder="Ex: Campinas, SP"
                  onChange={(e) => setEditFormData({ ...editFormData, local_destino_atual: e.target.value })} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <span className="text-sm text-muted-foreground">Local onde ficará livre</span>
                <Input value={String(editFormData.local_liberacao_prevista || '')} placeholder="Ex: Campinas, SP"
                  onChange={(e) => setEditFormData({ ...editFormData, local_liberacao_prevista: e.target.value })} />
              </div>
              <div className="flex flex-col space-y-1.5 pt-1">
                <span className="text-sm text-muted-foreground">Data Prevista de Liberação</span>
                <Input type="text" placeholder="DD/MM/AAAA" value={String(editFormData.data_previsao_disponibilidade || '')}
                  onChange={(e) => setEditFormData({ ...editFormData, data_previsao_disponibilidade: e.target.value })} />
              </div>
              <div className="col-span-2">
                <InputField label="Observação" value={editFormData.observacao} onChange={(v) => setEditFormData({ ...editFormData, observacao: v })} />
              </div>
            </>
          ) : (
            <>
              <FieldRow label="Status" value={String(data.disponivel?.status || '').toUpperCase()} />
              <FieldRow label="Localização atual" value={data.disponivel?.localizacao_atual} />
              <FieldRow label="Destino da viagem atual" value={data.disponivel?.local_destino_atual} />
              <FieldRow label="Local onde ficará livre" value={data.disponivel?.local_liberacao_prevista || data.disponivel?.local_disponibilidade} />
              <FieldRow label="Lat/Long" value={`${data.disponivel?.latitude || ''}, ${data.disponivel?.longitude || ''}`} />
              <FieldRow label="Previsão Liberação" value={data.disponivel?.data_previsao_disponibilidade ? new Date(String(data.disponivel.data_previsao_disponibilidade)).toLocaleDateString('pt-BR') : ''} />
              <div className="col-span-2"><FieldRow label="Obs" value={data.disponivel?.observacao} /></div>
              <div className="col-span-2 text-xs text-muted-foreground mt-2">Atualizado em: {formatDate(String(data.disponivel?.date_created || ''))}</div>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
