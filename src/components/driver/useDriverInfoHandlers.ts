import { useState } from 'react';
import { directus } from '@/lib/directus';
import { createItem, updateItem } from '@directus/sdk';
import { format, addMonths } from 'date-fns';
import { fetchAddressByCep, normalizeCep } from '@/lib/cepLookup';
import {
  formatDateForAPI,
  getCnhStatus,
  parseEligibleOperations,
  normalizeOperationToken,
  parseNumberOrUndefined,
} from './driver-utils';
import { deriveCnhValidadeStatus } from './driver-status-constants';
import type { DriverRelatedData } from './useDriverProfileData';

export function useDriverInfoHandlers(
  localDriverData: Record<string, unknown> | null,
  setLocalDriverData: (d: Record<string, unknown> | null) => void,
  data: DriverRelatedData,
  fetchRelatedData: () => Promise<void>,
  refreshToken: () => Promise<string>,
  logout: () => void,
  toast: (opts: { title: string; description?: string; variant?: 'destructive' }) => void,
  onUpdate?: (driver?: Record<string, unknown>) => void,
) {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoFormData, setInfoFormData] = useState<Record<string, unknown>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, unknown>>({});
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEditInfo = (source?: Record<string, unknown>) => {
    const src = source ?? localDriverData ?? {};
    const defaultVencimentoCx = format(addMonths(new Date(), 5), 'yyyy-MM-dd');
    let derivedStatus = String(src.status_cadastro || '');
    const cnhStatus = getCnhStatus(String(data.cnh?.validade || ''));
    if (cnhStatus === 'Expirado' && !['BLOQUEADO', 'REPROVADO'].includes(derivedStatus)) {
      derivedStatus = 'NECESSARIO ATUALIZAR';
    }
    setInfoFormData({
      nome: src.nome || data.cnh?.nome || '',
      telefone: src.telefone || '',
      forma_pagamento: src.forma_pagamento || '',
      cpf: src.cpf || data.cnh?.cpf || '',
      status_cadastro: derivedStatus,
      status_validade_cnh: deriveCnhValidadeStatus(String(data.cnh?.validade || ''), String(src.status_validade_cnh || '')),
      vencimento_cx: src.vencimento_cx || defaultVencimentoCx,
      observacao: src.observacao || '',
      validade_cnh: data.cnh?.validade || '',
      numero_antt: data.antt?.numero_antt || '',
      cep: data.comprovante_endereco?.cep || '',
      endereco: data.comprovante_endereco?.endereco || '',
      bairro: data.comprovante_endereco?.bairro || '',
      cidade: data.comprovante_endereco?.cidade || '',
      estado: data.comprovante_endereco?.estado || '',
      tipo_veiculo: src.tipo_veiculo || '',
      tipo_carroceria: src.tipo_carroceria || '',
      quantidade_eixo: src.quantidade_eixo || '',
      tipo_rota: src.tipo_rota || '',
      cliente: src.cliente || src.nome_transportadora || '',
    });
    setIsEditingInfo(true);
  };

  const handleStatusChange = (v: string) => {
    const newStatus = v === '_empty_' ? '' : v;
    const cnhStatus = getCnhStatus(String(data.cnh?.validade || ''));
    if (cnhStatus === 'Expirado' && !['NECESSARIO ATUALIZAR', 'BLOQUEADO', 'REPROVADO', ''].includes(newStatus)) {
      if (!window.confirm(`Atenção: CNH EXPIRADA!\nForçar status para ${newStatus}?`)) return;
    }
    setInfoFormData((prev) => ({ ...prev, status_cadastro: newStatus }));
  };

  const handleSaveInfo = async () => {
    const performSave = async () => {
      const motorPayload = {
        nome: infoFormData.nome, telefone: infoFormData.telefone,
        forma_pagamento: infoFormData.forma_pagamento, cpf: infoFormData.cpf,
        status_cadastro: infoFormData.status_cadastro || null,
        status_validade_cnh: infoFormData.status_validade_cnh || deriveCnhValidadeStatus(String(infoFormData.validade_cnh || '')) || null,
        vencimento_cx: formatDateForAPI(infoFormData.vencimento_cx) || null,
        observacao: infoFormData.observacao || null,
        tipo_veiculo: infoFormData.tipo_veiculo || null, tipo_carroceria: infoFormData.tipo_carroceria || null,
        quantidade_eixo: infoFormData.quantidade_eixo || null, tipo_rota: infoFormData.tipo_rota || null,
        cliente: infoFormData.cliente || null,
      };
      const addrPayload = {
        cep: infoFormData.cep || null, endereco: infoFormData.endereco || null,
        bairro: infoFormData.bairro || null, cidade: infoFormData.cidade || null,
        estado: infoFormData.estado || null,
      };
      const tel = infoFormData.telefone ? { telefone: infoFormData.telefone } : {};

      if (localDriverData?.id) {
        const updated = await directus.request(updateItem('cadastro_motorista', localDriverData.id as string, motorPayload));
        setLocalDriverData(updated as Record<string, unknown>);
        toast({ title: 'Atualizado com sucesso' });
        let changed = false;
        if (infoFormData.validade_cnh !== (data.cnh?.validade || '')) {
          const apiVal = formatDateForAPI(String(infoFormData.validade_cnh || ''));
          if (data.cnh?.id) await directus.request(updateItem('cnh', data.cnh.id as string, { validade: apiVal, ...tel }));
          else await directus.request(createItem('cnh', { motorista_id: localDriverData.id, validade: apiVal, ...tel }));
          changed = true;
        }
        if (infoFormData.cpf && infoFormData.cpf !== (data.cnh?.cpf || '')) {
          if (data.cnh?.id) await directus.request(updateItem('cnh', data.cnh.id as string, { cpf: infoFormData.cpf, ...tel }));
          else await directus.request(createItem('cnh', { motorista_id: localDriverData.id, cpf: infoFormData.cpf, ...tel }));
          changed = true;
        }
        const addrChanged = Object.entries(addrPayload).some(([k, v]) => v !== (data.comprovante_endereco?.[k] || ''));
        if (addrChanged) {
          if (data.comprovante_endereco?.id) await directus.request(updateItem('comprovante_endereco', data.comprovante_endereco.id as string, { ...addrPayload, ...tel }));
          else if (infoFormData.cep) await directus.request(createItem('comprovante_endereco', { motorista_id: localDriverData.id, ...addrPayload, ...tel }));
          changed = true;
        }
        if (changed) await fetchRelatedData();
        return updated as Record<string, unknown>;
      } else {
        const newDriver = await directus.request(createItem('cadastro_motorista', { ...motorPayload, status_cadastro: infoFormData.status_cadastro || 'draft' }));
        setLocalDriverData(newDriver as Record<string, unknown>);
        toast({ title: 'Motorista criado!' });
        const telN = infoFormData.telefone ? { telefone: infoFormData.telefone } : {};
        let created = false;
        if (infoFormData.validade_cnh || infoFormData.cpf) {
          await directus.request(createItem('cnh', { motorista_id: (newDriver as Record<string, unknown>).id, validade: infoFormData.validade_cnh ? formatDateForAPI(String(infoFormData.validade_cnh)) : undefined, cpf: infoFormData.cpf || undefined, ...telN }));
          created = true;
        }
        if (infoFormData.cep) {
          await directus.request(createItem('comprovante_endereco', { motorista_id: (newDriver as Record<string, unknown>).id, ...addrPayload, ...telN }));
          created = true;
        }
        if (created) await fetchRelatedData();
        return newDriver as Record<string, unknown>;
      }
    };

    setLoading(true);
    try {
      try {
        const result = await performSave();
        setIsEditingInfo(false);
        if (onUpdate) onUpdate(result);
      } catch (err: unknown) {
        const e = err as { message?: string; errors?: Array<{ message: string }> };
        if (e.message?.includes('Token expired') || e.message?.includes('401') || e.errors?.[0]?.message === 'Token expired.') {
          await refreshToken();
          const result = await performSave();
          setIsEditingInfo(false);
          if (onUpdate) onUpdate(result);
        } else throw err;
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: String(err) });
    } finally { setLoading(false); }
  };

  const handleCancelEditInfo = () => { setIsEditingInfo(false); setInfoFormData({}); };

  const handleCepLookup = async (rawCep: string) => {
    const digits = normalizeCep(rawCep);
    if (digits.length !== 8) return;
    setIsCepLoading(true);
    try {
      const address = await fetchAddressByCep(digits);
      if (!address) { toast({ variant: 'destructive', title: 'CEP não encontrado' }); return; }
      setInfoFormData((prev) => ({ ...prev, cep: address.cep, endereco: address.endereco, bairro: address.bairro, cidade: address.cidade, estado: address.estado }));
      toast({ title: 'Endereço preenchido automaticamente' });
    } catch (err: unknown) { toast({ variant: 'destructive', title: 'Erro ao buscar CEP', description: (err as Error).message }); }
    finally { setIsCepLoading(false); }
  };

  const handleEditAvailability = () => {
    const src = (data.disponivel || {}) as Record<string, unknown>;
    setEditFormData({
      status: src.status || 'disponivel',
      localizacao_atual: src.localizacao_atual || '',
      local_destino_atual: src.local_destino_atual || src.localizacao_atual || '',
      local_liberacao_prevista: src.local_liberacao_prevista || src.local_disponibilidade || src.localizacao_atual || '',
      latitude: src.latitude ?? '',
      longitude: src.longitude ?? '',
      data_previsao_disponibilidade: src.data_previsao_disponibilidade ? new Date(String(src.data_previsao_disponibilidade)).toISOString().split('T')[0] : '',
      observacao: src.observacao || '',
    });
    setIsEditingAvailability(true);
  };

  const handleSaveAvailability = async () => {
    setLoading(true);
    try {
      if (!localDriverData?.id) { toast({ variant: 'destructive', title: 'Salve o motorista antes.' }); return; }
      if (!localDriverData.telefone) { toast({ variant: 'destructive', title: 'Telefone Obrigatório', description: 'Cadastre um telefone primeiro.' }); return; }
      const payload = {
        motorista_id: localDriverData.id, telefone: localDriverData.telefone,
        status: editFormData.status || 'disponivel',
        disponivel: editFormData.status === 'disponivel',
        localizacao_atual: editFormData.localizacao_atual,
        local_destino_atual: editFormData.local_destino_atual || editFormData.localizacao_atual,
        local_liberacao_prevista: editFormData.local_liberacao_prevista || editFormData.localizacao_atual,
        local_disponibilidade: editFormData.local_liberacao_prevista || editFormData.localizacao_atual,
        latitude: parseNumberOrUndefined(editFormData.latitude),
        longitude: parseNumberOrUndefined(editFormData.longitude),
        data_previsao_disponibilidade: editFormData.data_previsao_disponibilidade || null,
        observacao: editFormData.observacao,
      };
      if (data.disponivel?.id) await directus.request(updateItem('disponivel', data.disponivel.id as string, payload));
      else await directus.request(createItem('disponivel', payload));
      setIsEditingAvailability(false);
      await fetchRelatedData();
      toast({ title: 'Disponibilidade atualizada' });
    } catch (err: unknown) { toast({ variant: 'destructive', title: 'Erro ao salvar', description: (err as Error).message }); }
    finally { setLoading(false); }
  };

  const handleGeocodeLocation = async () => {
    if (!editFormData.localizacao_atual) { toast({ variant: 'destructive', title: 'Digite um local' }); return; }
    setIsGeocoding(true);
    try {
      const q = encodeURIComponent(String(editFormData.localizacao_atual));
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br,ar,uy,py,cl,bo,pe,ec,ve,co,gy,sr&q=${q}`;
      const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9', 'User-Agent': 'GMX Logistica/1.0' } });
      if (!resp.ok) throw new Error('Falha na conexão com servidor de mapas.');
      const results = await resp.json() as Array<{ lat: string; lon: string; display_name: string }>;
      if (results?.length > 0) {
        const { lat, lon, display_name } = results[0];
        setEditFormData((prev) => ({ ...prev, latitude: Number(lat).toFixed(6), longitude: Number(lon).toFixed(6) }));
        toast({ title: 'Local encontrado!', description: `${display_name.split(',')[0]}...` });
      } else {
        toast({ variant: 'destructive', title: 'Local não encontrado.' });
      }
    } catch (err: unknown) { toast({ variant: 'destructive', title: 'Erro na geolocalização', description: (err as Error).message }); }
    finally { setIsGeocoding(false); }
  };

  const handleCancelEdit = () => { setIsEditingAvailability(false); setEditFormData({}); };

  const operacoesSelecionadas = parseEligibleOperations(infoFormData.tipo_rota);
  const toggleOperacaoElegivel = (operacao: string) => {
    const tok = normalizeOperationToken(operacao);
    const atuais = parseEligibleOperations(infoFormData.tipo_rota);
    const proximas = atuais.includes(tok) ? atuais.filter((i) => i !== tok) : [...atuais, tok];
    setInfoFormData((prev) => ({ ...prev, tipo_rota: proximas.join(', ') }));
  };

  return {
    isEditingInfo, setIsEditingInfo,
    infoFormData, setInfoFormData,
    isGeocoding,
    isEditingAvailability,
    editFormData, setEditFormData,
    isCepLoading,
    loading,
    operacoesSelecionadas,
    handleEditInfo,
    handleSaveInfo,
    handleCancelEditInfo,
    handleStatusChange,
    handleCepLookup,
    handleEditAvailability,
    handleSaveAvailability,
    handleGeocodeLocation,
    handleCancelEdit,
    toggleOperacaoElegivel,
  };
}
