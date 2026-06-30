import { useState } from 'react';
import { directus } from '@/lib/directus';
import { createItem, updateItem } from '@directus/sdk';
import { formatDateForAPI } from './driver-utils';
import { deriveCnhValidadeStatus } from './driver-status-constants';
import type { DriverRelatedData } from './useDriverProfileData';

type DocType = 'cnh' | 'crlv' | 'antt' | 'comprovante_endereco';

export function useDriverDocHandlers(
  localDriverData: Record<string, unknown> | null,
  setLocalDriverData: (d: Record<string, unknown> | null) => void,
  data: DriverRelatedData,
  fetchRelatedData: () => Promise<void>,
  refreshToken: () => Promise<string>,
  logout: () => void,
  toast: (opts: { title: string; description?: string; variant?: 'destructive' }) => void,
) {
  const [isEditingCNH, setIsEditingCNH] = useState(false);
  const [cnhForm, setCnhForm] = useState<Record<string, unknown>>({});
  const [isEditingCRLV, setIsEditingCRLV] = useState(false);
  const [crlvForm, setCrlvForm] = useState<Record<string, unknown>>({});
  const [isEditingANTT, setIsEditingANTT] = useState(false);
  const [anttForm, setAnttForm] = useState<Record<string, unknown>>({});
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<Record<string, unknown>>({});
  const [isEditingCarreta, setIsEditingCarreta] = useState(false);
  const [currentCarretaIndex, setCurrentCarretaIndex] = useState<number | null>(null);
  const [carretaForm, setCarretaForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  const formMap: Record<DocType, (v: Record<string, unknown>) => void> = {
    cnh: setCnhForm, crlv: setCrlvForm, antt: setAnttForm, comprovante_endereco: setAddressForm,
  };
  const stateMap: Record<DocType, (v: boolean) => void> = {
    cnh: setIsEditingCNH, crlv: setIsEditingCRLV, antt: setIsEditingANTT, comprovante_endereco: setIsEditingAddress,
  };

  const handleEditDoc = (type: DocType, currentData: Record<string, unknown> | null) => {
    formMap[type](currentData ? { ...currentData } : {});
    stateMap[type](true);
  };

  const handleSaveDoc = async (type: DocType, formData: Record<string, unknown>, currentData: Record<string, unknown> | null) => {
    setLoading(true);
    try {
      const motoristaId = localDriverData?.id;
      if (!motoristaId) { toast({ variant: 'destructive', title: 'Salve o motorista antes de anexar documentos.' }); return; }

      const payload = { ...formData };
      if (localDriverData?.telefone) payload.telefone = localDriverData.telefone;
      for (const field of ['data_nasc', 'validade', 'emissao_cnh', 'primeira_habilitacao']) {
        if (payload[field]) payload[field] = formatDateForAPI(String(payload[field]));
      }

      const doSave = async () => {
        if (currentData?.id) await directus.request(updateItem(type, currentData.id as string, payload));
        else await directus.request(createItem(type, { ...payload, motorista_id: motoristaId }));
        toast({ title: `${type.toUpperCase()} ${currentData?.id ? 'atualizado' : 'criado'}` });

        if (type === 'cnh' && formData.cpf) {
          const upd = await directus.request(updateItem('cadastro_motorista', motoristaId as string, { cpf: formData.cpf }));
          setLocalDriverData(upd as Record<string, unknown>);
        }
        if (type === 'cnh' && formData.validade) {
          const derived = deriveCnhValidadeStatus(String(formData.validade), String(localDriverData?.status_validade_cnh || ''));
          if (!localDriverData?.status_validade_cnh && derived) {
            const upd = await directus.request(updateItem('cadastro_motorista', motoristaId as string, { status_validade_cnh: derived }));
            setLocalDriverData(upd as Record<string, unknown>);
          }
        }
      };

      try {
        await doSave();
      } catch (err: unknown) {
        const e = err as { message?: string; errors?: Array<{ message: string }> };
        if (e.message?.includes('Token expired') || e.message?.includes('401') || e.errors?.[0]?.message === 'Token expired.') {
          await refreshToken();
          await doSave();
        } else throw err;
      }

      stateMap[type](false);
      await fetchRelatedData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: String(err) });
    } finally { setLoading(false); }
  };

  const handleCancelDoc = (type: DocType) => stateMap[type](false);

  const handleEditCarreta = (index: number, carretaData: Record<string, unknown> | null) => {
    setCurrentCarretaIndex(index);
    setCarretaForm(carretaData ? { ...carretaData } : {});
    setIsEditingCarreta(true);
  };

  const handleSaveCarreta = async () => {
    if (currentCarretaIndex === null) return;
    const current = data.carretas[currentCarretaIndex];
    if (!current) return;
    setLoading(true);
    try {
      const payload = { ...carretaForm };
      if (localDriverData?.telefone) payload.telefone = localDriverData.telefone;

      const doSave = async () => {
        if (current.data?.id) await directus.request(updateItem(current.collection as 'carreta_1', current.data.id as string, payload));
        else await directus.request(createItem(current.collection as 'carreta_1', { ...payload, motorista_id: localDriverData?.id }));
        toast({ title: `${current.type} ${current.data?.id ? 'atualizada' : 'criada'}` });
      };

      try {
        await doSave();
        setIsEditingCarreta(false);
        setCurrentCarretaIndex(null);
        await fetchRelatedData();
      } catch (err: unknown) {
        const e = err as { message?: string; errors?: Array<{ message: string }> };
        if (e.message?.includes('Token expired') || e.message?.includes('401') || e.errors?.[0]?.message === 'Token expired.') {
          await refreshToken();
          await doSave();
          setIsEditingCarreta(false);
          setCurrentCarretaIndex(null);
          await fetchRelatedData();
        } else throw err;
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: String(err) });
    } finally { setLoading(false); }
  };

  const handleCancelCarreta = () => { setIsEditingCarreta(false); setCurrentCarretaIndex(null); setCarretaForm({}); };

  return {
    isEditingCNH, cnhForm, setCnhForm,
    isEditingCRLV, crlvForm, setCrlvForm,
    isEditingANTT, anttForm, setAnttForm,
    isEditingAddress, addressForm, setAddressForm,
    isEditingCarreta, currentCarretaIndex, carretaForm, setCarretaForm,
    loading,
    handleEditDoc,
    handleSaveDoc,
    handleCancelDoc,
    handleEditCarreta,
    handleSaveCarreta,
    handleCancelCarreta,
  };
}
