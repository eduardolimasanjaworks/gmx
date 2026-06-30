import { useState, useEffect, useRef } from 'react';
import { directus } from '@/lib/directus';
import { readItems } from '@directus/sdk';
import { useAuth } from '@/context/AuthContext';
import { uploadToDirectus } from '@/lib/directusUpload';
import { useToast } from '@/hooks/use-toast';
import { ADMIN_TOKEN } from './driver-utils';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type DriverRelatedData = {
  cnh: Record<string, unknown> | null;
  antt: Record<string, unknown> | null;
  crlv: Record<string, unknown> | null;
  comprovante_endereco: Record<string, unknown> | null;
  fotos: Record<string, unknown> | null;
  carretas: Array<{ type: string; collection: string; data: Record<string, unknown> | null }>;
  disponivel: Record<string, unknown> | null;
};

const EMPTY_DATA: DriverRelatedData = {
  cnh: null, antt: null, crlv: null, comprovante_endereco: null,
  fotos: null, carretas: [], disponivel: null,
};

export function useDriverProfileData(
  open: boolean,
  driverData: Record<string, unknown> | undefined,
  initialEditMode: boolean,
  initialTab: string | undefined,
  onEditInfo: (source?: Record<string, unknown>) => void,
) {
  const { refreshToken, logout, token } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<DriverRelatedData>(EMPTY_DATA);
  const [localDriverData, setLocalDriverData] = useState<Record<string, unknown> | null>(driverData ?? null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [filesServiceAvailable] = useState(true);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('geral');

  const tabStorageKey = localDriverData?.id ? `driver-profile-tab:${localDriverData.id}` : null;
  const lastOpenRef = useRef(false);

  useEffect(() => { setLocalDriverData(driverData ?? null); }, [driverData]);

  useEffect(() => {
    if (!open || !data.cnh?.cpf || localDriverData?.cpf) return;
    setLocalDriverData((prev) => prev ? { ...prev, cpf: data.cnh!.cpf } : prev);
  }, [open, data.cnh?.cpf, localDriverData?.cpf]);

  useEffect(() => {
    if (open) {
      if (driverData?.id) {
        setLocalDriverData(driverData);
        if (initialEditMode) onEditInfo(driverData);
        void fetchRelatedData();
      } else {
        setLocalDriverData(null);
        setData(EMPTY_DATA);
        setActiveTab('geral');
      }
    } else {
      setLocalDriverData(null);
      setData(EMPTY_DATA);
      setActiveTab('geral');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, driverData?.id, initialEditMode]);

  useEffect(() => {
    if (open) {
      const isFirstOpen = !lastOpenRef.current;
      lastOpenRef.current = true;
      if (isFirstOpen && initialTab) {
        setActiveTab(initialTab);
        try { if (tabStorageKey) window.localStorage.setItem(tabStorageKey, initialTab); } catch {}
        return;
      }
      try {
        if (tabStorageKey) {
          const s = window.localStorage.getItem(tabStorageKey);
          if (s) setActiveTab(s);
        }
      } catch {}
    } else {
      setActiveTab('geral');
      lastOpenRef.current = false;
    }
  }, [open, tabStorageKey, initialTab]);

  const handleTabChange = (next: string) => {
    setActiveTab(next);
    try { if (tabStorageKey) window.localStorage.setItem(tabStorageKey, next); } catch {}
  };

  const fetchRelatedData = async () => {
    if (!driverData?.id) return;
    setLoading(true);
    try {
      const id = driverData.id;
      const f = (col: string, extra?: Record<string, unknown>) =>
        directus.request(readItems(col as 'cnh', { filter: { motorista_id: { _eq: id } }, ...extra }));
      const [cnhR, anttR, crlvR, compR, fotosR, c1R, c2R, c3R, dispR] = await Promise.all([
        f('cnh'), f('antt'), f('crlv'), f('comprovante_endereco'), f('fotos'),
        f('carreta_1'), f('carreta_2'), f('carreta_3'),
        f('disponivel', { sort: ['-date_created'], limit: 1, fields: ['*', 'user_created.*'] }),
      ]);
      setData({
        cnh: (cnhR[0] as Record<string, unknown>) ?? null,
        antt: (anttR[0] as Record<string, unknown>) ?? null,
        crlv: (crlvR[0] as Record<string, unknown>) ?? null,
        comprovante_endereco: (compR[0] as Record<string, unknown>) ?? null,
        fotos: (fotosR[0] as Record<string, unknown>) ?? null,
        carretas: [
          { type: 'Carreta 1', collection: 'carreta_1', data: (c1R[0] as Record<string, unknown>) ?? null },
          { type: 'Carreta 2', collection: 'carreta_2', data: (c2R[0] as Record<string, unknown>) ?? null },
          { type: 'Carreta 3', collection: 'carreta_3', data: (c3R[0] as Record<string, unknown>) ?? null },
        ],
        disponivel: (dispR[0] as Record<string, unknown>) ?? null,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const performOCR = async (file: File): Promise<string> => {
    setOcrLoading(true);
    try {
      let objectUrl: string;
      const imgScale = file.type === 'application/pdf' ? 1 : 3;

      if (file.type === 'application/pdf') {
        const ab = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
        let fullNativeText = '';
        const pages = [];
        let totalH = 0, maxW = 0;
        const vps = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          pages.push(page);
          const tc = await page.getTextContent();
          let pt = ''; let lastY = -1;
          for (const item of tc.items as Array<{ transform: number[]; str: string }>) {
            if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) pt += '\n';
            else if (lastY !== -1 && item.str.trim()) pt += ' ';
            pt += item.str; lastY = item.transform[5];
          }
          fullNativeText += pt + '\n';
          const vp = page.getViewport({ scale: 4.0 });
          vps.push(vp); totalH += vp.height; if (vp.width > maxW) maxW = vp.width;
        }
        const pc = document.createElement('canvas');
        const pCtx = pc.getContext('2d');
        if (!pCtx) throw new Error('Canvas unavailable');
        pc.width = maxW; pc.height = totalH;
        pCtx.fillStyle = 'white'; pCtx.fillRect(0, 0, maxW, totalH);
        let curY = 0;
        for (let i = 0; i < pages.length; i++) {
          const vp = vps[i];
          const lc = document.createElement('canvas');
          lc.width = vp.width; lc.height = vp.height;
          const lCtx = lc.getContext('2d');
          if (lCtx) {
            lCtx.fillStyle = 'white'; lCtx.fillRect(0, 0, vp.width, vp.height);
            await pages[i].render({ canvasContext: lCtx, viewport: vp }).promise;
            pCtx.drawImage(lc, 0, curY);
          }
          curY += vp.height;
        }
        objectUrl = pc.toDataURL('image/png');
        (file as File & { _nativeText?: string })._nativeText = fullNativeText;
      } else {
        objectUrl = URL.createObjectURL(file);
      }

      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = objectUrl; });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      canvas.width = img.width * imgScale; canvas.height = img.height * imgScale;
      ctx.filter = 'grayscale(1) contrast(1.2)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (file.type !== 'application/pdf') URL.revokeObjectURL(objectUrl);

      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('por');
      const ret = await worker.recognize(canvas.toDataURL('image/png'));
      await worker.terminate();
      let txt = ret.data.text;
      const native = (file as File & { _nativeText?: string })._nativeText;
      if (native) txt += '\n\n' + native;
      return txt;
    } finally { setOcrLoading(false); }
  };

  const uploadPublicAndGetUrl = async (file: File, _key: string): Promise<string> => {
    try {
      return await uploadToDirectus(file, undefined, token || undefined);
    } catch (error: unknown) {
      const e = error as { message?: string; errors?: Array<{ message: string }> };
      if (e.message?.includes('403') || e.message?.includes('Forbidden') || e.message?.includes('permission')) {
        return await uploadToDirectus(file, undefined, ADMIN_TOKEN);
      }
      if (e.message?.includes('Token expired') || e.message?.includes('401') || e.errors?.[0]?.message === 'Token expired.') {
        const newToken = await refreshToken();
        return await uploadToDirectus(file, undefined, newToken);
      }
      throw error;
    }
  };

  return {
    data, setData,
    localDriverData, setLocalDriverData,
    loading, setLoading,
    ocrLoading,
    uploadingKey, setUploadingKey,
    filesServiceAvailable,
    documentUrl, setDocumentUrl,
    activeTab, handleTabChange,
    fetchRelatedData,
    performOCR,
    uploadPublicAndGetUrl,
    refreshToken, logout, toast,
  };
}
