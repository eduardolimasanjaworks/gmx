/**
 * Gerenciamento de risco (GR) em embarques — marcação com auditoria.
 */
import { directus } from '@/lib/directus';
import { createItem, updateItem } from '@directus/sdk';

export type AcaoGrLog = 'marcado' | 'desmarcado';

export interface DadosGrEmbarque {
  gr_feito?: boolean | null;
  gr_feito_em?: string | null;
  gr_feito_por_nome?: string | null;
  gr_feito_por_id?: string | null;
}

export interface AtendenteGr {
  id: string;
  nome: string;
}

async function registrarGrLog(opts: {
  embarqueId: string | number;
  acao: AcaoGrLog;
  atendente: AtendenteGr;
  observacao?: string;
}): Promise<void> {
  try {
    await directus.request(
      createItem('embarque_gr_log', {
        embarque_id: Number(opts.embarqueId),
        acao: opts.acao,
        atendente_nome: opts.atendente.nome,
        atendente_id: opts.atendente.id,
        observacao: opts.observacao?.trim() || null,
      }),
    );
  } catch (err) {
    console.warn('[embarque-gr] log auditoria falhou:', err);
    throw err;
  }
}

export async function marcarGrFeito(
  embarqueId: string | number,
  atendente: AtendenteGr,
): Promise<DadosGrEmbarque> {
  const agora = new Date().toISOString();
  const campos: DadosGrEmbarque = {
    gr_feito: true,
    gr_feito_em: agora,
    gr_feito_por_nome: atendente.nome,
    gr_feito_por_id: atendente.id,
  };

  await directus.request(updateItem('embarques', String(embarqueId), campos));
  await registrarGrLog({ embarqueId, acao: 'marcado', atendente });
  return campos;
}

export async function desmarcarGrFeito(
  embarqueId: string | number,
  atendente: AtendenteGr,
  observacao: string,
): Promise<DadosGrEmbarque> {
  const motivo = observacao.trim();
  if (!motivo) {
    throw new Error('Informe o motivo para desmarcar o GR');
  }

  const campos: DadosGrEmbarque = {
    gr_feito: false,
    gr_feito_em: null,
    gr_feito_por_nome: null,
    gr_feito_por_id: null,
  };

  await directus.request(updateItem('embarques', String(embarqueId), campos));
  await registrarGrLog({
    embarqueId,
    acao: 'desmarcado',
    atendente,
    observacao: motivo,
  });
  return campos;
}

export function formatarGrFeitoEm(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
