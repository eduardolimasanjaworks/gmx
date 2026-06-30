import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, X, Save, Loader2 } from 'lucide-react';
import { MarcacaoSection, MarcacaoRow } from '@/components/driver/MarcacaoLayout';
import { TipoCarroceriaSelect } from '@/components/driver/TipoCarroceriaSelect';
import { CnhValidadeStatusSelect } from '@/components/driver/CnhValidadeStatusSelect';
import { StatusCadastroSelect, StatusCadastroBadge } from '@/components/driver/StatusCadastroSelect';
import { deriveCnhValidadeStatus, getCnhValidadeStatusBadgeColor, getVencimentoCxBadgeColor } from '@/components/driver/driver-status-constants';
import { IaAtendimentoPanel } from '@/components/driver/IaAtendimentoPanel';
import { formatCep, normalizeCep } from '@/lib/cepLookup';
import { FieldRow, formatDate, normalizeOperationToken } from './driver-utils';
import type { DriverRelatedData } from './useDriverProfileData';

interface Props {
  data: DriverRelatedData;
  localDriverData: Record<string, unknown> | null;
  isEditingInfo: boolean;
  infoFormData: Record<string, unknown>;
  setInfoFormData: (d: Record<string, unknown>) => void;
  isCepLoading: boolean;
  loading: boolean;
  operacoesSelecionadas: string[];
  tiposOperacao: Array<{ id: string | number; nome: string; ativo?: boolean }>;
  onEditInfo: () => void;
  onSaveInfo: () => Promise<void>;
  onCancelEditInfo: () => void;
  onStatusChange: (v: string) => void;
  onCepLookup: (cep: string) => Promise<void>;
  onToggleOperacao: (op: string) => void;
  fetchRelatedData: () => Promise<void>;
}

export function DriverTabGeral({
  data, localDriverData, isEditingInfo, infoFormData, setInfoFormData,
  isCepLoading, loading, operacoesSelecionadas, tiposOperacao,
  onEditInfo, onSaveInfo, onCancelEditInfo, onStatusChange, onCepLookup, onToggleOperacao, fetchRelatedData,
}: Props) {
  const resolvedCpf = String(localDriverData?.cpf || data.cnh?.cpf || '');
  const resolvedNome = String(localDriverData?.nome || '');
  const resolvedTransportadora = String(localDriverData?.cliente || localDriverData?.nome_transportadora || '');

  return (
    <TabsContent value="geral" className="space-y-4 mt-4">
      <IaAtendimentoPanel
        telefone={localDriverData?.telefone as string | undefined}
        motoristaId={localDriverData?.id as number | undefined}
        onUpdate={() => void fetchRelatedData()}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 justify-between">
            Cadastro do Motorista
            {!isEditingInfo ? (
              <Button variant="ghost" size="sm" onClick={onEditInfo}><Pencil className="h-4 w-4 mr-2" /> Editar</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onCancelEditInfo} disabled={loading}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
                <Button size="sm" onClick={onSaveInfo} disabled={loading}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MarcacaoSection title="Resumo do Cadastro">
            {isEditingInfo ? (
              <>
                <MarcacaoRow label="Nome Transportadora">
                  <Input className="max-w-[55%] h-8 text-right text-sm" value={String(infoFormData.cliente || '')}
                    onChange={(e) => setInfoFormData({ ...infoFormData, cliente: e.target.value })} placeholder="Transportadora" />
                </MarcacaoRow>
                <MarcacaoRow label="Nome Motorista">
                  <Input className="max-w-[55%] h-8 text-right text-sm" value={String(infoFormData.nome || '')}
                    onChange={(e) => setInfoFormData({ ...infoFormData, nome: e.target.value })} placeholder="Nome completo" />
                </MarcacaoRow>
                <MarcacaoRow label="CPF Motorista">
                  <Input className="max-w-[55%] h-8 text-right text-sm" value={String(infoFormData.cpf || '')}
                    onChange={(e) => setInfoFormData({ ...infoFormData, cpf: e.target.value })} placeholder="000.000.000-00" />
                </MarcacaoRow>
                <MarcacaoRow label="Telefone Motorista">
                  <Input className="max-w-[55%] h-8 text-right text-sm" value={String(infoFormData.telefone || '')}
                    onChange={(e) => setInfoFormData({ ...infoFormData, telefone: e.target.value })} placeholder="(00) 00000-0000" />
                </MarcacaoRow>
              </>
            ) : (
              <>
                <MarcacaoRow label="Nome Transportadora" value={resolvedTransportadora} />
                <MarcacaoRow label="Nome Motorista" value={resolvedNome} emphasize />
                <MarcacaoRow label="CPF Motorista" value={resolvedCpf} />
                <MarcacaoRow label="Telefone Motorista" value={localDriverData?.telefone as string | undefined} />
              </>
            )}
            <MarcacaoRow label="Placa do Cavalo" value={data.crlv?.placa_cavalo as string | undefined} />
            {data.carretas.map((carreta, idx) => (
              <MarcacaoRow key={carreta.type} label={`Placa da Carreta ${idx + 1}`} value={carreta.data?.placa as string | undefined} />
            ))}
          </MarcacaoSection>

          <MarcacaoSection title="Controle Cadastral">
            {isEditingInfo ? (
              <>
                <MarcacaoRow label="Validade CNH">
                  <CnhValidadeStatusSelect value={String(infoFormData.status_validade_cnh || '')} onChange={(v) => setInfoFormData({ ...infoFormData, status_validade_cnh: v })} />
                </MarcacaoRow>
                <MarcacaoRow label="Status">
                  <StatusCadastroSelect value={String(infoFormData.status_cadastro || '')} onChange={onStatusChange} />
                </MarcacaoRow>
                <MarcacaoRow label="Venc CX">
                  <Input className="max-w-[55%] h-8 text-right text-sm ml-auto" value={String(infoFormData.vencimento_cx || '')}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                      if (v.length > 4) v = v.replace(/^(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
                      else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)/, '$1/$2');
                      setInfoFormData({ ...infoFormData, vencimento_cx: v });
                    }} placeholder="DD/MM/AAAA" />
                </MarcacaoRow>
                <div className="px-4 py-3 space-y-2">
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground">Observação</span>
                  <Textarea value={String(infoFormData.observacao || '')} onChange={(e) => setInfoFormData({ ...infoFormData, observacao: e.target.value })} placeholder="Texto livre..." rows={4} className="text-sm" />
                </div>
              </>
            ) : (
              <>
                <MarcacaoRow label="Validade CNH">
                  {localDriverData?.status_validade_cnh || deriveCnhValidadeStatus(String(data.cnh?.validade || '')) ? (
                    <Badge className={`${getCnhValidadeStatusBadgeColor(String(localDriverData?.status_validade_cnh || deriveCnhValidadeStatus(String(data.cnh?.validade || ''))))} text-xs border-transparent`}>
                      {String(localDriverData?.status_validade_cnh || deriveCnhValidadeStatus(String(data.cnh?.validade || '')))}
                    </Badge>
                  ) : <span className="text-sm text-muted-foreground/50 italic">(vazio)</span>}
                </MarcacaoRow>
                <MarcacaoRow label="Status"><StatusCadastroBadge status={localDriverData?.status_cadastro as string | undefined} /></MarcacaoRow>
                <MarcacaoRow label="Venc CX">
                  {localDriverData?.vencimento_cx ? (
                    <Badge className={`${getVencimentoCxBadgeColor(String(localDriverData.vencimento_cx))} text-xs border-transparent`}>
                      {formatDate(String(localDriverData.vencimento_cx))}
                    </Badge>
                  ) : <span className="text-sm text-muted-foreground/50 italic">(vazio)</span>}
                </MarcacaoRow>
                <div className="px-4 py-3 space-y-2 border-t border-border/60">
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground">Observação</span>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {localDriverData?.observacao ? String(localDriverData.observacao).trim() : <span className="text-muted-foreground/50 italic">(vazio)</span>}
                  </p>
                </div>
              </>
            )}
          </MarcacaoSection>

          <MarcacaoSection title="Informações Complementares">
            {isEditingInfo ? (
              <>
                <MarcacaoRow label="Forma Pgto">
                  <Input className="max-w-[55%] h-8 text-right text-sm" value={String(infoFormData.forma_pagamento || '')} onChange={(e) => setInfoFormData({ ...infoFormData, forma_pagamento: e.target.value })} />
                </MarcacaoRow>
                <MarcacaoRow label="Tipo de Veículo">
                  <Input className="max-w-[55%] h-8 text-right text-sm" value={String(infoFormData.tipo_veiculo || '')} onChange={(e) => setInfoFormData({ ...infoFormData, tipo_veiculo: e.target.value })} />
                </MarcacaoRow>
                <MarcacaoRow label="Tipo de Carroceria">
                  <TipoCarroceriaSelect value={String(infoFormData.tipo_carroceria || '')} onChange={(v) => setInfoFormData({ ...infoFormData, tipo_carroceria: v })} />
                </MarcacaoRow>
                <MarcacaoRow label="Quantidade de Eixo">
                  <Input className="max-w-[55%] h-8 text-right text-sm" value={String(infoFormData.quantidade_eixo || '')} onChange={(e) => setInfoFormData({ ...infoFormData, quantidade_eixo: e.target.value })} />
                </MarcacaoRow>
                <div className="px-4 py-3 space-y-3 border-t border-border/60">
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground">Operações elegíveis para embarque</span>
                  <Input value={String(infoFormData.tipo_rota || '')} onChange={(e) => setInfoFormData({ ...infoFormData, tipo_rota: e.target.value })} placeholder="Ex: GRANEL, CIMENTO, SIDER" className="text-sm" />
                  <p className="text-xs text-muted-foreground">Alimenta apenas o ranking de motoristas. Não interfere na fila diária de abordagem proativa.</p>
                  {tiposOperacao.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tiposOperacao.filter((t) => t.ativo !== false).map((tipo) => {
                        const nome = normalizeOperationToken(tipo.nome);
                        const ativo = operacoesSelecionadas.includes(nome);
                        return (
                          <Button key={tipo.id} type="button" size="sm" variant={ativo ? 'default' : 'outline'} className="h-7" onClick={() => onToggleOperacao(nome)}>{nome}</Button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <MarcacaoRow label="CEP">
                  <div className="flex items-center gap-2 max-w-[55%] ml-auto">
                    <Input className="h-8 text-right text-sm" value={String(infoFormData.cep || '')}
                      onChange={(e) => {
                        const formatted = formatCep(e.target.value);
                        setInfoFormData({ ...infoFormData, cep: formatted });
                        if (normalizeCep(formatted).length === 8) void onCepLookup(formatted);
                      }} placeholder="00000-000" />
                    {isCepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </MarcacaoRow>
                <MarcacaoRow label="Endereço" value={infoFormData.endereco as string | undefined} />
                <MarcacaoRow label="Bairro" value={infoFormData.bairro as string | undefined} />
                <MarcacaoRow label="Cidade" value={infoFormData.cidade as string | undefined} />
                <MarcacaoRow label="UF" value={infoFormData.estado as string | undefined} />
                <MarcacaoRow label="Cadastrado" value={formatDate(String(localDriverData?.date_created || ''))} />
              </>
            ) : (
              <>
                <FieldRow label="Forma Pgto" value={localDriverData?.forma_pagamento} />
                <FieldRow label="Tipo de Veículo" value={localDriverData?.tipo_veiculo} />
                <FieldRow label="Tipo de Carroceria" value={localDriverData?.tipo_carroceria} />
                <FieldRow label="Quantidade de Eixo" value={localDriverData?.quantidade_eixo} />
                <FieldRow label="Operações Elegíveis" value={localDriverData?.tipo_rota} />
                <FieldRow label="CEP" value={data.comprovante_endereco?.cep} />
                <FieldRow label="Endereço" value={data.comprovante_endereco?.endereco} />
                <FieldRow label="Bairro" value={data.comprovante_endereco?.bairro} />
                <FieldRow label="Cidade" value={data.comprovante_endereco?.cidade} />
                <FieldRow label="UF" value={data.comprovante_endereco?.estado} />
                <FieldRow label="Cadastrado" value={formatDate(String(localDriverData?.date_created || ''))} />
              </>
            )}
          </MarcacaoSection>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
