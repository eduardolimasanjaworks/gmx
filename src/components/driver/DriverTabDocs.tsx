import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, X, Save, FileText, Truck, ScrollText, AlertCircle, ScanText, Loader2 } from 'lucide-react';
import { FieldRow, InputField, CpfInputField, formatDate, getCnhStatus, getAuthenticatedUrl, ADMIN_TOKEN } from './driver-utils';
import { DriverAiDocumentsPanel } from '@/components/driver/DriverAiDocumentsPanel';
import type { DriverRelatedData } from './useDriverProfileData';

interface AttachmentEditorProps {
  label?: string; value: unknown; uploadingId: string;
  onChange: (url: string) => void; onOcrResult?: (text: string) => void;
  uploadingKey: string | null; setUploadingKey: (k: string | null) => void;
  filesServiceAvailable: boolean; ocrLoading: boolean;
  uploadPublicAndGetUrl: (f: File, k: string) => Promise<string>;
  performOCR: (f: File) => Promise<string>;
  toast: (opts: { title: string; description?: string; variant?: 'destructive' }) => void;
}

function AttachmentEditor({ label = 'Anexo', value, uploadingId, onChange, onOcrResult, uploadingKey, setUploadingKey, filesServiceAvailable, ocrLoading, uploadPublicAndGetUrl, performOCR, toast }: AttachmentEditorProps) {
  const isUploading = uploadingKey === uploadingId;
  return (
    <div className="col-span-2 border rounded-md p-3 bg-muted/10">
      <div className="text-sm font-medium mb-2">{label}</div>
      <Input type="file" accept="image/*,application/pdf" disabled={isUploading || !filesServiceAvailable} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          setUploadingKey(uploadingId);
          const url = await uploadPublicAndGetUrl(file, uploadingId);
          onChange(url);
          toast({ title: 'Upload concluído' });
          if ((file.type.startsWith('image/') || file.type === 'application/pdf') && onOcrResult) {
            toast({ title: 'Processando Leitura...' });
            const text = await performOCR(file);
            onOcrResult(text);
            toast({ title: 'Leitura Concluída' });
          }
        } catch (err) { toast({ variant: 'destructive', title: 'Erro', description: String(err) }); }
        finally { setUploadingKey(null); e.target.value = ''; }
      }} />
      {isUploading && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Enviando...</span>}
      {ocrLoading && uploadingKey === uploadingId && <span className="text-xs text-muted-foreground flex items-center gap-1"><ScanText className="h-3 w-3 animate-pulse" /> Lendo imagem...</span>}
    </div>
  );
}

function AttachmentPreview({ label = 'Anexo', value, setDocumentUrl }: { label?: string; value?: unknown; setDocumentUrl: (u: string | null) => void }) {
  return (
    <div className="col-span-2 border rounded-md p-2 bg-muted/5 flex items-center justify-between mt-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value ? (
        <Button variant="link" className="h-auto p-0 text-blue-600" onClick={() => setDocumentUrl(getAuthenticatedUrl(String(value)) ?? null)}>Visualizar Documento</Button>
      ) : (
        <span className="text-xs text-muted-foreground italic flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Pendente</span>
      )}
    </div>
  );
}

interface Props {
  data: DriverRelatedData;
  localDriverData: Record<string, unknown> | null;
  isEditingCNH: boolean; cnhForm: Record<string, unknown>; setCnhForm: (d: Record<string, unknown>) => void;
  isEditingCRLV: boolean; crlvForm: Record<string, unknown>; setCrlvForm: (d: Record<string, unknown>) => void;
  isEditingANTT: boolean; anttForm: Record<string, unknown>; setAnttForm: (d: Record<string, unknown>) => void;
  isEditingCarreta: boolean; currentCarretaIndex: number | null; carretaForm: Record<string, unknown>; setCarretaForm: (d: Record<string, unknown>) => void;
  loading: boolean; uploadingKey: string | null; setUploadingKey: (k: string | null) => void;
  filesServiceAvailable: boolean; ocrLoading: boolean;
  setDocumentUrl: (url: string | null) => void;
  parseCnhOcrData: (text: string, current: Record<string, unknown>) => Record<string, unknown>;
  onEditDoc: (type: 'cnh' | 'crlv' | 'antt' | 'comprovante_endereco', data: Record<string, unknown> | null) => void;
  onSaveDoc: (type: 'cnh' | 'crlv' | 'antt' | 'comprovante_endereco', form: Record<string, unknown>, current: Record<string, unknown> | null) => Promise<void>;
  onCancelDoc: (type: 'cnh' | 'crlv' | 'antt' | 'comprovante_endereco') => void;
  onEditCarreta: (idx: number, data: Record<string, unknown> | null) => void;
  onSaveCarreta: () => Promise<void>;
  onCancelCarreta: () => void;
  fetchRelatedData: () => Promise<void>;
  uploadPublicAndGetUrl: (f: File, k: string) => Promise<string>;
  performOCR: (f: File) => Promise<string>;
  toast: (opts: { title: string; description?: string; variant?: 'destructive' }) => void;
}

export function DriverTabDocs({
  data, localDriverData,
  isEditingCNH, cnhForm, setCnhForm,
  isEditingCRLV, crlvForm, setCrlvForm,
  isEditingANTT, anttForm, setAnttForm,
  isEditingCarreta, currentCarretaIndex, carretaForm, setCarretaForm,
  loading, uploadingKey, setUploadingKey, filesServiceAvailable, ocrLoading,
  setDocumentUrl, parseCnhOcrData,
  onEditDoc, onSaveDoc, onCancelDoc, onEditCarreta, onSaveCarreta, onCancelCarreta,
  fetchRelatedData, uploadPublicAndGetUrl, performOCR, toast,
}: Props) {
  const shared = { uploadingKey, setUploadingKey, filesServiceAvailable, ocrLoading, uploadPublicAndGetUrl, performOCR, toast };

  return (
    <TabsContent value="docs" className="space-y-4 mt-4">
      {localDriverData?.id && (
        <DriverAiDocumentsPanel motoristaId={localDriverData.id as string} telefone={localDriverData.telefone as string | undefined}
          adminToken={ADMIN_TOKEN} onUpdated={() => void fetchRelatedData()} />
      )}

      {/* CNH */}
      <Card>
        <CardHeader className="py-3 px-4 bg-muted/20 border-b">
          <CardTitle className="text-base flex justify-between items-center">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> CNH</div>
            {!isEditingCNH ? (
              <Button variant="ghost" size="sm" onClick={() => onEditDoc('cnh', data.cnh)}><Pencil className="h-3 w-3 mr-1" /> Editar / Anexar</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onCancelDoc('cnh')} disabled={loading}><X className="h-3 w-3" /></Button>
                <Button size="sm" onClick={() => onSaveDoc('cnh', cnhForm, data.cnh)} disabled={loading}><Save className="h-3 w-3" /></Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid gap-1 md:grid-cols-2">
          {isEditingCNH ? (
            <>
              <CpfInputField label="CPF" value={cnhForm.cpf} onChange={(v) => setCnhForm({ ...cnhForm, cpf: v })} referenceCpf={localDriverData?.cpf as string | undefined} />
              <InputField label="Data Nasc" isDate value={cnhForm.data_nasc} onChange={(v) => setCnhForm({ ...cnhForm, data_nasc: v })} />
              <InputField label="Nome Mãe" value={cnhForm.nome_mae} onChange={(v) => setCnhForm({ ...cnhForm, nome_mae: v })} />
              <InputField label="Registro CNH" value={cnhForm.n_registro_cnh} onChange={(v) => setCnhForm({ ...cnhForm, n_registro_cnh: v })} />
              <InputField label="Nº CNH Documento / Formulário" value={cnhForm.n_formulario_cnh} onChange={(v) => setCnhForm({ ...cnhForm, n_formulario_cnh: v })} />
              <InputField label="Validade CNH" isDate value={cnhForm.validade} onChange={(v) => setCnhForm({ ...cnhForm, validade: v })} />
              <InputField label="Emissão CNH" isDate value={cnhForm.emissao_cnh} onChange={(v) => setCnhForm({ ...cnhForm, emissao_cnh: v })} />
              <InputField label="Nº CNH Segurança" value={cnhForm.n_cnh_seguranca} onChange={(v) => setCnhForm({ ...cnhForm, n_cnh_seguranca: v })} />
              <InputField label="Nº CNH Renach" value={cnhForm.n_cnh_renach} onChange={(v) => setCnhForm({ ...cnhForm, n_cnh_renach: v })} />
              <InputField label="1ª Habilitação" isDate value={cnhForm.primeira_habilitacao} onChange={(v) => setCnhForm({ ...cnhForm, primeira_habilitacao: v })} />
              <InputField label="Categoria" value={cnhForm.categoria} onChange={(v) => setCnhForm({ ...cnhForm, categoria: v })} />
              <InputField label="Cidade Emissão" value={cnhForm.cidade_emissao} onChange={(v) => setCnhForm({ ...cnhForm, cidade_emissao: v })} />
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">Dados OCR / Observações</span>
                <Textarea value={String(cnhForm.observacao || '')} onChange={(e) => setCnhForm({ ...cnhForm, observacao: e.target.value })} rows={3} placeholder="Texto extraído pelo OCR..." />
              </div>
              <div className="col-span-2 mt-2">
                <AttachmentEditor label="Anexo CNH" value={cnhForm.link} uploadingId="cnh_upload"
                  onChange={(v) => setCnhForm({ ...cnhForm, link: v })}
                  onOcrResult={(text) => setCnhForm((prev) => parseCnhOcrData(text, prev))} {...shared} />
              </div>
            </>
          ) : (
            <>
              <FieldRow label="CPF" value={data.cnh?.cpf} />
              <FieldRow label="Data Nasc" value={formatDate(String(data.cnh?.data_nasc || ''))} />
              <FieldRow label="Nome Mãe" value={data.cnh?.nome_mae} />
              <FieldRow label="Registro CNH" value={data.cnh?.n_registro_cnh} />
              <FieldRow label="Nº CNH Documento / Formulário" value={data.cnh?.n_formulario_cnh} />
              <div className="flex items-center justify-between border-b pb-2 h-9">
                <span className="text-sm text-muted-foreground">Validade:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{formatDate(String(data.cnh?.validade || ''))}</span>
                  {data.cnh?.validade && (
                    <Badge className={`text-[10px] px-1.5 h-5 ${getCnhStatus(String(data.cnh.validade)) === 'No Prazo' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                      {getCnhStatus(String(data.cnh.validade))}
                    </Badge>
                  )}
                </div>
              </div>
              <FieldRow label="Emissão CNH" value={formatDate(String(data.cnh?.emissao_cnh || ''))} />
              <FieldRow label="CNH Segurança" value={data.cnh?.n_cnh_seguranca} />
              <FieldRow label="CNH Renach" value={data.cnh?.n_cnh_renach} />
              <FieldRow label="1ª Habilitação" value={formatDate(String(data.cnh?.primeira_habilitacao || ''))} />
              <FieldRow label="Categoria" value={data.cnh?.categoria} />
              <FieldRow label="Cidade Emissão" value={data.cnh?.cidade_emissao} />
              <AttachmentPreview label="Anexo CNH" value={data.cnh?.link} setDocumentUrl={setDocumentUrl} />
              {data.cnh?.observacao && <div className="col-span-2 mt-2 p-2 bg-muted/20 rounded text-xs"><span className="font-semibold">OCR/Obs:</span> {String(data.cnh.observacao)}</div>}
            </>
          )}
        </CardContent>
      </Card>

      {/* CRLV */}
      <Card>
        <CardHeader className="py-3 px-4 bg-muted/20 border-b">
          <CardTitle className="text-base flex justify-between items-center">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> CRLV (Cavalo)</div>
            {!isEditingCRLV ? (
              <Button variant="ghost" size="sm" onClick={() => onEditDoc('crlv', data.crlv)}><Pencil className="h-3 w-3 mr-1" /> Editar / Anexar</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onCancelDoc('crlv')} disabled={loading}><X className="h-3 w-3" /></Button>
                <Button size="sm" onClick={() => onSaveDoc('crlv', crlvForm, data.crlv)} disabled={loading}><Save className="h-3 w-3" /></Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid gap-1 md:grid-cols-2">
          {isEditingCRLV ? (
            <>
              <InputField label="Placa" value={crlvForm.placa_cavalo} onChange={(v) => setCrlvForm({ ...crlvForm, placa_cavalo: v })} />
              <InputField label="Proprietário" value={crlvForm.nome_proprietario} onChange={(v) => setCrlvForm({ ...crlvForm, nome_proprietario: v })} />
              <CpfInputField label="CPF/CNPJ Prop." value={crlvForm.cnpj_cpf} onChange={(v) => setCrlvForm({ ...crlvForm, cnpj_cpf: v })} referenceCpf={localDriverData?.cpf as string | undefined} />
              <InputField label="Renavam" value={crlvForm.renavam} onChange={(v) => setCrlvForm({ ...crlvForm, renavam: v })} />
              <InputField label="Modelo" value={crlvForm.modelo} onChange={(v) => setCrlvForm({ ...crlvForm, modelo: v })} />
              <InputField label="Ano Fab" value={crlvForm.ano_fabricacao} onChange={(v) => setCrlvForm({ ...crlvForm, ano_fabricacao: v })} />
              <InputField label="Ano Mod" value={crlvForm.ano_modelo} onChange={(v) => setCrlvForm({ ...crlvForm, ano_modelo: v })} />
              <InputField label="Nr. Certificado" value={crlvForm.nr_certificado} onChange={(v) => setCrlvForm({ ...crlvForm, nr_certificado: v })} />
              <InputField label="Exercício Doc" value={crlvForm.exercicio_doc} onChange={(v) => setCrlvForm({ ...crlvForm, exercicio_doc: v })} />
              <InputField label="Cor" value={crlvForm.cor} onChange={(v) => setCrlvForm({ ...crlvForm, cor: v })} />
              <InputField label="Chassi" value={crlvForm.chassi} onChange={(v) => setCrlvForm({ ...crlvForm, chassi: v })} />
              <InputField label="Cidade Emplacado" value={crlvForm.cidade_emplacado} onChange={(v) => setCrlvForm({ ...crlvForm, cidade_emplacado: v })} />
              <div className="col-span-2">
                <span className="text-sm text-muted-foreground">Dados OCR / Observações</span>
                <Textarea value={String(crlvForm.observacao || '')} onChange={(e) => setCrlvForm({ ...crlvForm, observacao: e.target.value })} rows={3} placeholder="Texto extraído..." />
              </div>
              <div className="col-span-2 mt-2">
                <AttachmentEditor label="Anexo CRLV" value={crlvForm.link} uploadingId="crlv_upload"
                  onChange={(v) => setCrlvForm({ ...crlvForm, link: v })}
                  onOcrResult={(text) => setCrlvForm((prev) => ({ ...prev, observacao: prev.observacao ? `${prev.observacao}\n\n[OCR]: ${text}` : `[OCR]: ${text}` }))} {...shared} />
              </div>
            </>
          ) : (
            <>
              <FieldRow label="Placa" value={data.crlv?.placa_cavalo} />
              <FieldRow label="Proprietário" value={data.crlv?.nome_proprietario} />
              <FieldRow label="CPF/CNPJ" value={data.crlv?.cnpj_cpf} />
              <FieldRow label="Renavam" value={data.crlv?.renavam} />
              <FieldRow label="Modelo" value={data.crlv?.modelo} />
              <FieldRow label="Ano Fab" value={data.crlv?.ano_fabricacao} />
              <FieldRow label="Ano Mod" value={data.crlv?.ano_modelo} />
              <FieldRow label="Nr. Certificado" value={data.crlv?.nr_certificado} />
              <FieldRow label="Exercício Doc" value={data.crlv?.exercicio_doc} />
              <FieldRow label="Cor" value={data.crlv?.cor} />
              <FieldRow label="Chassi" value={data.crlv?.chassi} />
              <FieldRow label="Cidade Emplacado" value={data.crlv?.cidade_emplacado} />
              <AttachmentPreview label="Anexo CRLV" value={data.crlv?.link} setDocumentUrl={setDocumentUrl} />
              {data.crlv?.observacao && <div className="col-span-2 mt-2 p-2 bg-muted/20 rounded text-xs"><span className="font-semibold">OCR/Obs:</span> {String(data.crlv.observacao)}</div>}
            </>
          )}
          {/* ANTT Cavalo inline */}
          <div className="col-span-2 mt-4 pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold flex items-center gap-2"><ScrollText className="h-4 w-4" /> ANTT Cavalo</span>
              {!isEditingANTT ? (
                <Button variant="ghost" size="sm" onClick={() => onEditDoc('antt', data.antt)}><Pencil className="h-3 w-3 mr-1" /> Editar / Anexar</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onCancelDoc('antt')} disabled={loading}><X className="h-3 w-3" /></Button>
                  <Button size="sm" onClick={() => onSaveDoc('antt', anttForm, data.antt)} disabled={loading}><Save className="h-3 w-3" /></Button>
                </div>
              )}
            </div>
            {isEditingANTT ? (
              <div className="grid gap-1 md:grid-cols-2">
                <FieldRow label="Placa" value={crlvForm.placa_cavalo || data.crlv?.placa_cavalo} />
                <InputField label="Número ANTT" value={anttForm.numero_antt} onChange={(v) => setAnttForm({ ...anttForm, numero_antt: v })} />
                <CpfInputField label="CNPJ/CPF" value={anttForm.cnpj_cpf} onChange={(v) => setAnttForm({ ...anttForm, cnpj_cpf: v })} referenceCpf={localDriverData?.cpf as string | undefined} />
                <InputField label="Nome" value={anttForm.nome} onChange={(v) => setAnttForm({ ...anttForm, nome: v })} />
                <div className="col-span-2 mt-2">
                  <AttachmentEditor label="Anexo ANTT Cavalo" value={anttForm.link} uploadingId="antt_upload"
                    onChange={(v) => setAnttForm({ ...anttForm, link: v })}
                    onOcrResult={(text) => setAnttForm((prev) => ({ ...prev, observacao: prev.observacao ? `${prev.observacao}\n\n[OCR]: ${text}` : `[OCR]: ${text}` }))} {...shared} />
                </div>
              </div>
            ) : (
              <div className="grid gap-1 md:grid-cols-2">
                <FieldRow label="Placa" value={data.crlv?.placa_cavalo} />
                <FieldRow label="Número ANTT" value={data.antt?.numero_antt} />
                <FieldRow label="CNPJ/CPF" value={data.antt?.cnpj_cpf} />
                <FieldRow label="Nome" value={data.antt?.nome} />
                <AttachmentPreview label="Anexo ANTT Cavalo" value={data.antt?.link} setDocumentUrl={setDocumentUrl} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Carretas */}
      {data.carretas.map((carreta, index) => {
        const isEditingThis = isEditingCarreta && currentCarretaIndex === index;
        return (
          <Card key={index}>
            <CardHeader className="py-3 px-4 bg-muted/20 border-b">
              <CardTitle className="flex items-center gap-2 text-base justify-between">
                <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> {carreta.type}</div>
                {!isEditingThis ? (
                  <Button variant="ghost" size="sm" onClick={() => onEditCarreta(index, carreta.data)}><Pencil className="h-3 w-3 mr-2" /> Editar / Anexar</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onCancelCarreta} disabled={loading}><X className="h-3 w-3" /></Button>
                    <Button size="sm" onClick={onSaveCarreta} disabled={loading}><Save className="h-3 w-3" /></Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid gap-1 md:grid-cols-2 lg:grid-cols-3">
              {isEditingThis ? (
                <>
                  <InputField label="Placa" value={carretaForm.placa} onChange={(v) => setCarretaForm({ ...carretaForm, placa: v })} />
                  <InputField label="Renavam" value={carretaForm.renavam} onChange={(v) => setCarretaForm({ ...carretaForm, renavam: v })} />
                  <InputField label="Proprietário" value={carretaForm.proprietario_documento} onChange={(v) => setCarretaForm({ ...carretaForm, proprietario_documento: v })} />
                  <InputField label="CPF/CNPJ" value={carretaForm.cnpj_cpf_proprietario} onChange={(v) => setCarretaForm({ ...carretaForm, cnpj_cpf_proprietario: v })} />
                  <InputField label="Modelo" value={carretaForm.modelo} onChange={(v) => setCarretaForm({ ...carretaForm, modelo: v })} />
                  <InputField label="Ano Fab" value={carretaForm.ano_fabricacao} onChange={(v) => setCarretaForm({ ...carretaForm, ano_fabricacao: v })} />
                  <InputField label="Ano Mod" value={carretaForm.ano_modelo} onChange={(v) => setCarretaForm({ ...carretaForm, ano_modelo: v })} />
                  <div className="col-span-full mt-3 pt-3 border-t">
                    <span className="text-sm font-semibold flex items-center gap-2 mb-2"><ScrollText className="h-4 w-4" /> ANTT {carreta.type}</span>
                    <div className="grid gap-1 md:grid-cols-2">
                      <FieldRow label="Placa" value={carretaForm.placa} />
                      <InputField label="Número ANTT" value={carretaForm.antt_numero} onChange={(v) => setCarretaForm({ ...carretaForm, antt_numero: v })} />
                      <InputField label="CNPJ/CPF" value={carretaForm.antt_cnpj_cpf} onChange={(v) => setCarretaForm({ ...carretaForm, antt_cnpj_cpf: v })} />
                      <InputField label="Nome" value={carretaForm.antt_nome} onChange={(v) => setCarretaForm({ ...carretaForm, antt_nome: v })} />
                    </div>
                  </div>
                  <div className="col-span-full">
                    <span className="text-sm text-muted-foreground">Dados OCR (Observações)</span>
                    <Textarea value={String(carretaForm.observacao || '')} onChange={(e) => setCarretaForm({ ...carretaForm, observacao: e.target.value })} rows={3} placeholder="Texto extraído..." />
                  </div>
                  <div className="col-span-full pt-2">
                    <AttachmentEditor label="Anexo Carreta" value={carretaForm.link} uploadingId={`cart_${index}`}
                      onChange={(v) => setCarretaForm({ ...carretaForm, link: v })}
                      onOcrResult={(text) => setCarretaForm((prev) => ({ ...prev, observacao: prev.observacao ? `${prev.observacao}\n\n[OCR]: ${text}` : `[OCR]: ${text}` }))} {...shared} />
                  </div>
                </>
              ) : (
                <>
                  <FieldRow label="Placa" value={carreta.data?.placa} />
                  <FieldRow label="Renavam" value={carreta.data?.renavam} />
                  <FieldRow label="Proprietário" value={carreta.data?.proprietario_documento} />
                  <FieldRow label="CPF/CNPJ" value={carreta.data?.cnpj_cpf_proprietario} />
                  <FieldRow label="Modelo" value={carreta.data?.modelo} />
                  <FieldRow label="Ano" value={carreta.data ? `${carreta.data.ano_fabricacao || ''}/${carreta.data.ano_modelo || ''}` : ''} />
                  <div className="col-span-full mt-3 pt-3 border-t">
                    <span className="text-sm font-semibold flex items-center gap-2 mb-2"><ScrollText className="h-4 w-4" /> ANTT {carreta.type}</span>
                    <div className="grid gap-1 md:grid-cols-2">
                      <FieldRow label="Placa" value={carreta.data?.placa} />
                      <FieldRow label="Número ANTT" value={carreta.data?.antt_numero} />
                      <FieldRow label="CNPJ/CPF" value={carreta.data?.antt_cnpj_cpf} />
                      <FieldRow label="Nome" value={carreta.data?.antt_nome} />
                    </div>
                  </div>
                  <div className="col-span-full">
                    <AttachmentPreview label="Anexo Carreta" value={carreta.data?.link} setDocumentUrl={setDocumentUrl} />
                    {carreta.data?.observacao && <div className="mt-2 p-2 bg-muted/20 rounded text-xs"><span className="font-semibold">OCR/Obs:</span> {String(carreta.data.observacao)}</div>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </TabsContent>
  );
}
