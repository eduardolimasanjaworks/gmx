import React, { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CloudUpload, ImageIcon, Plus, RefreshCw } from 'lucide-react';
import { directus, directusUrl } from '@/lib/directus';
import { readItems, updateItem } from '@directus/sdk';
import { getAuthenticatedUrl, ADMIN_TOKEN } from './driver-utils';
import type { DriverRelatedData } from './useDriverProfileData';

interface AttachmentEditorProps {
  label?: string; value: string; uploadingId: string;
  onChange: (url: string) => Promise<void> | void;
  uploadingKey: string | null; setUploadingKey: (k: string | null) => void;
  uploadPublicAndGetUrl: (file: File, key: string) => Promise<string>;
  toast: (opts: { title: string; description?: string; variant?: 'destructive' }) => void;
}

function FotoUploader({ label = 'Enviar', value, uploadingId, onChange, uploadingKey, setUploadingKey, uploadPublicAndGetUrl, toast }: AttachmentEditorProps) {
  const isUploading = uploadingKey === uploadingId;
  return (
    <div className="col-span-2 border rounded-md p-3 bg-muted/10">
      <div className="text-sm font-medium mb-2">{label}</div>
      <Input type="file" accept="image/*,application/pdf" disabled={isUploading} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          setUploadingKey(uploadingId);
          const url = await uploadPublicAndGetUrl(file, uploadingId);
          await onChange(url);
          toast({ title: 'Upload concluído' });
        } catch (err) {
          toast({ variant: 'destructive', title: 'Erro', description: String(err) });
        } finally { setUploadingKey(null); e.target.value = ''; }
      }} />
      {isUploading && <span className="text-xs text-muted-foreground">Enviando...</span>}
    </div>
  );
}

interface Props {
  data: DriverRelatedData;
  setData: (updater: (prev: DriverRelatedData) => DriverRelatedData) => void;
  driverData: Record<string, unknown> | undefined;
  localDriverData: Record<string, unknown> | null;
  setDocumentUrl: (url: string | null) => void;
  uploadingKey: string | null;
  setUploadingKey: (k: string | null) => void;
  uploadPublicAndGetUrl: (file: File, key: string) => Promise<string>;
  toast: (opts: { title: string; description?: string; variant?: 'destructive' }) => void;
}

export function DriverTabFotos({ data, setData, driverData, localDriverData, setDocumentUrl, uploadingKey, setUploadingKey, uploadPublicAndGetUrl, toast }: Props) {
  const [isDrivePopupOpen, setIsDrivePopupOpen] = useState(false);
  const [driveFolderName, setDriveFolderName] = useState('');
  const [driveRootFolderId, setDriveRootFolderId] = useState('1WSKCajrztXNyQ1Yy8dJkeN8-LeDzE_vk');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  const handleUploadToDrive = async () => {
    setIsUploadingToDrive(true);
    try {
      const photos = [
        { key: 'foto_cavalo', label: 'Cavalo', url: getAuthenticatedUrl(String(data.fotos?.foto_cavalo || '')) },
        { key: 'foto_lateral', label: 'Lateral', url: getAuthenticatedUrl(String(data.fotos?.foto_lateral || '')) },
        { key: 'foto_traseira', label: 'Traseira', url: getAuthenticatedUrl(String(data.fotos?.foto_traseira || '')) },
      ].filter((p) => p.url);
      if (!photos.length) { toast({ variant: 'destructive', title: 'Nenhuma foto anexada' }); return; }
      const nomeMot = String(localDriverData?.nome || driverData?.nome || 'Desconhecido');
      const placa = String(data.crlv?.placa_cavalo || 'SemPlaca');
      toast({ title: 'Criando pasta...' });
      const folderRes = await fetch('/create-drive-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderName: driveFolderName || nomeMot, parentFolderId: driveRootFolderId }) });
      if (!folderRes.ok) throw new Error((await folderRes.json()).error || 'Falha ao criar pasta');
      const { folderId } = await folderRes.json();
      toast({ title: 'Pasta criada', description: `Enviando ${photos.length} fotos...` });
      for (const photo of photos) {
        const res = await fetch(photo.url!);
        if (!res.ok) throw new Error(`Falha ao baixar: ${photo.label}`);
        const blob = await res.blob();
        const fd = new FormData();
        const cleanName = nomeMot.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${placa}_${cleanName}_${photo.label}.jpg`.replace(/[^a-zA-Z0-9_.-]/g, '_');
        fd.append('file', blob, fileName); fd.append('fileName', fileName); fd.append('folderId', folderId);
        const up = await fetch('/upload-to-drive', { method: 'POST', body: fd });
        if (!up.ok) throw new Error((await up.json()).error || `Falha no upload de ${photo.label}`);
      }
      toast({ title: 'Sucesso', description: 'Fotos enviadas para o Google Drive!' });
      setIsDrivePopupOpen(false);
    } catch (err: unknown) { toast({ variant: 'destructive', title: 'Erro ao Enviar ao Drive', description: (err as Error).message }); }
    finally { setIsUploadingToDrive(false); }
  };

  const handleFotoChange = async (key: string, url: string) => {
    if (!url || !driverData?.id) return;
    const headers = { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' };
    const telefone = String(localDriverData?.telefone || driverData.telefone || '');
    let fotosId = data.fotos?.id as string | undefined;
    if (!fotosId) {
      if (telefone) {
        try {
          const res = await fetch(`${directusUrl}/items/fotos?filter[telefone][_eq]=${telefone}&limit=1&fields=id,motorista_id`, { headers });
          const json = await res.json();
          if (json.data?.[0]) { fotosId = json.data[0].id; }
        } catch { /* ignore */ }
      }
      if (!fotosId) {
        const res = await fetch(`${directusUrl}/items/fotos`, { method: 'POST', headers, body: JSON.stringify({ motorista_id: driverData.id, telefone }) });
        const json = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(json));
        fotosId = json.data?.id;
      }
      const r = await directus.request(readItems('fotos', { filter: { motorista_id: { _eq: driverData.id } } }));
      setData((prev) => ({ ...prev, fotos: (r[0] as Record<string, unknown>) || (fotosId ? { id: fotosId } : null) }));
    }
    if (fotosId) {
      await fetch(`${directusUrl}/items/fotos/${fotosId}`, { method: 'PATCH', headers, body: JSON.stringify({ [key]: url }) });
      toast({ title: 'Foto anexada', description: `Foto atualizada.` });
      const r = await directus.request(readItems('fotos', { filter: { motorista_id: { _eq: driverData.id } } }));
      setData((prev) => ({ ...prev, fotos: (r[0] as Record<string, unknown>) || prev.fotos }));
    }
  };

  const fotoItems = [
    { label: 'Foto Cavalo', key: 'foto_cavalo', url: getAuthenticatedUrl(String(data.fotos?.foto_cavalo || '')) },
    { label: 'Foto Lateral', key: 'foto_lateral', url: getAuthenticatedUrl(String(data.fotos?.foto_lateral || '')) },
    { label: 'Foto Traseira', key: 'foto_traseira', url: getAuthenticatedUrl(String(data.fotos?.foto_traseira || '')) },
  ];

  return (
    <TabsContent value="fotos" className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle>Fotos do Veículo</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">Fotos são gerenciadas principalmente via aplicativo móvel. Aqui você pode visualizar e enviar fotos.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fotoItems.map((item) => (
              <div key={item.key} className="flex flex-col gap-2">
                <span className="font-medium text-sm text-center">{item.label}</span>
                {item.url ? (
                  <div className="relative aspect-video bg-muted rounded-md overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity group" onClick={() => setDocumentUrl(item.url!)}>
                    <img src={item.url} alt={item.label} className="object-cover w-full h-full" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                      <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Visualizar</span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-md border flex items-center justify-center text-muted-foreground text-xs flex-col gap-1">
                    <ImageIcon className="h-5 w-5 opacity-50" /> Sem foto
                  </div>
                )}
                <FotoUploader label={`Enviar ${item.label}`} value="" uploadingId={item.key} onChange={(url) => handleFotoChange(item.key, url)}
                  uploadingKey={uploadingKey} setUploadingKey={setUploadingKey} uploadPublicAndGetUrl={uploadPublicAndGetUrl} toast={toast} />
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end border-t pt-4">
            <Button onClick={() => { setDriveFolderName(String(localDriverData?.nome || driverData?.nome || '')); setIsDrivePopupOpen(true); }}
              disabled={isUploadingToDrive} className="bg-green-600 hover:bg-green-700 text-white flex gap-2 items-center">
              <CloudUpload className="h-4 w-4" /> Enviar Fotos para o Google Drive
            </Button>
          </div>

          <Dialog open={isDrivePopupOpen} onOpenChange={setIsDrivePopupOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar para o Google Drive</DialogTitle>
                <DialogDescription className="sr-only">Confirme o nome da pasta</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <p className="text-sm text-muted-foreground">Confirme o nome da pasta no Google Drive.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Pasta</label>
                  <Input value={driveFolderName} onChange={(e) => setDriveFolderName(e.target.value)} placeholder="Nome do Cliente/Motorista" />
                </div>
                <details className="cursor-pointer group">
                  <summary className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                    <Plus className="h-3 w-3 group-open:rotate-45 transition-transform" /> Configurações Avançadas
                  </summary>
                  <div className="mt-2 space-y-2">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">ID da Pasta Raiz</label>
                    <Input value={driveRootFolderId} onChange={(e) => setDriveRootFolderId(e.target.value)} className="h-8 text-xs font-mono" />
                  </div>
                </details>
              </div>
              <DialogFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDrivePopupOpen(false)} disabled={isUploadingToDrive}>Cancelar</Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2" onClick={handleUploadToDrive} disabled={!driveFolderName || isUploadingToDrive}>
                  {isUploadingToDrive ? <><RefreshCw className="h-4 w-4 animate-spin" /> Processando...</> : <><CloudUpload className="h-4 w-4" /> Criar Pasta e Enviar</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-6 pt-4 border-t space-y-4">
            <h4 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Adicionar Fotos Extras</h4>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900 text-sm">
              <p className="text-blue-700 dark:text-blue-300">Você pode anexar fotos adicionais livremente.</p>
            </div>
            <FotoUploader label="Upload de Nova Foto" value="" uploadingId="extra_photo_upload"
              onChange={async (url) => {
                if (url && data.fotos?.id) {
                  try {
                    const currentObs = String(data.fotos.observacao || '');
                    const dateStr = new Date().toLocaleString('pt-BR');
                    const newObs = currentObs ? `${currentObs}\n\n[${dateStr}] Foto Extra: ${url}` : `[${dateStr}] Foto Extra: ${url}`;
                    await directus.request(updateItem('fotos' as 'cadastro_motorista', data.fotos.id as string, { observacao: newObs }));
                    toast({ title: 'Foto anexada com sucesso!' });
                    if (driverData?.id) {
                      const r = await directus.request(readItems('fotos', { filter: { motorista_id: { _eq: driverData.id } } }));
                      setData((prev) => ({ ...prev, fotos: (r[0] as Record<string, unknown>) || null }));
                    }
                  } catch (err) { toast({ title: 'Erro ao salvar vínculo', description: String(err), variant: 'destructive' }); }
                }
              }}
              uploadingKey={uploadingKey} setUploadingKey={setUploadingKey} uploadPublicAndGetUrl={uploadPublicAndGetUrl} toast={toast} />
            {data.fotos?.observacao && (
              <div>
                <span className="text-sm font-semibold block mb-2">Fotos Extras / Observações:</span>
                <div className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono border">{String(data.fotos.observacao)}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {String(data.fotos.observacao).match(/https?:\/\/[^\s]+/g)?.map((link, i) => (
                    <Button key={i} variant="outline" size="sm" className="h-6 text-xs" onClick={() => setDocumentUrl(link)}>Ver Anexo {i + 1}</Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
