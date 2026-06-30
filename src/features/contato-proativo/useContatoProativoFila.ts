import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  adiarContatoProativo,
  adiarContatoProativoEmLote,
  aprovarContatoProativo,
  aprovarContatoProativoEmLote,
  dispararContatoProativo,
  dispararContatoProativoEmLote,
  fetchContatoProativoAtual,
  fetchContatoProativoHistorico,
  gerarContatoProativo,
  type ContatoProativoHistoricoItem,
  type ContatoProativoItem,
  type ContatoProativoSnapshot,
  type CriteriosGeracao,
} from '@/services/iagmxContatoProativoService';

export type { ContatoProativoItem, ContatoProativoHistoricoItem, CriteriosGeracao };

export interface FiltrosTabela {
  busca: string;
  categoria: 'todos' | 'diario' | 'padrao';
  topX: number;
}

export const FILTROS_PADRAO: FiltrosTabela = {
  busca: '',
  categoria: 'todos',
  topX: 50,
};

export function useContatoProativoFila() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [snapshot, setSnapshot] = useState<ContatoProativoSnapshot | null>(null);
  const [historico, setHistorico] = useState<ContatoProativoHistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filtros, setFiltros] = useState<FiltrosTabela>(FILTROS_PADRAO);
  const [criterios, setCriterios] = useState<CriteriosGeracao>({
    limite: 300,
    janela_em_carga_horas: 24,
    janela_padrao_horas: 72,
    considerar_compromissos_futuros: false,
  });
  const [diasAdiar, setDiasAdiar] = useState(3);
  const [intervaloSegundos, setIntervaloSegundos] = useState(20);

  const autor = useMemo(
    () => user?.email || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'portal',
    [user],
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [data, hist] = await Promise.all([
        fetchContatoProativoAtual(),
        fetchContatoProativoHistorico(150),
      ]);
      setSnapshot(data);
      setHistorico(hist.itens);
    } catch (err) {
      toast({ title: 'Erro ao carregar fila', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void carregar(); }, [carregar]);

  const itensBrutos = snapshot?.itens ?? [];

  const itensFiltrados = useMemo(() => {
    const busca = filtros.busca.toLowerCase().trim();
    return itensBrutos
      .filter((item) => {
        if (filtros.categoria !== 'todos' && item.frequencia_categoria !== filtros.categoria) return false;
        if (busca) {
          const nome = (item.nome ?? '').toLowerCase();
          const tel = item.telefone.toLowerCase();
          if (!nome.includes(busca) && !tel.includes(busca)) return false;
        }
        return true;
      })
      .slice(0, filtros.topX);
  }, [itensBrutos, filtros]);

  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => itensFiltrados.some((item) => item.id === id)));
  }, [itensFiltrados]);

  const agir = useCallback(async (chave: string, acao: () => Promise<unknown>, msg: string) => {
    setBusy(chave);
    try {
      await acao();
      toast({ title: msg });
      await carregar();
    } catch (err: unknown) {
      toast({ title: 'Falha', description: (err as Error)?.message ?? String(err), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }, [toast, carregar]);

  const toggleItem = useCallback((id: number, checked: boolean) => {
    setSelectedIds((ids) => checked ? [...new Set([...ids, id])] : ids.filter((i) => i !== id));
  }, []);

  const toggleTodos = useCallback((checked: boolean) => {
    setSelectedIds(checked ? itensFiltrados.map((i) => i.id) : []);
  }, [itensFiltrados]);

  const selecionados = itensFiltrados.filter((i) => selectedIds.includes(i.id));

  const aprovarSelecionados = () => {
    const ids = selecionados.filter((i) => i.status_item === 'pendente').map((i) => i.id);
    if (!ids.length) { toast({ title: 'Nenhum pendente selecionado' }); return; }
    void agir('aprovar-lote', () => aprovarContatoProativoEmLote(ids, autor), 'Motoristas aprovados');
  };

  const adiarSelecionados = () => {
    const ids = selecionados.filter((i) => i.status_item !== 'disparado').map((i) => i.id);
    if (!ids.length) { toast({ title: 'Nenhum elegivel para adiamento' }); return; }
    void agir(`adiar-lote`, () => adiarContatoProativoEmLote({ itemIds: ids, autor, dias: diasAdiar }), `Adiado ${diasAdiar} dia(s)`);
  };

  const dispararSelecionados = () => {
    const ids = selecionados.filter((i) => i.status_item === 'aprovado').map((i) => i.id);
    if (!ids.length) { toast({ title: 'Nenhum aprovado selecionado' }); return; }
    void agir('disparar-lote', () => dispararContatoProativoEmLote({ itemIds: ids, autor, intervaloMs: intervaloSegundos * 1000 }), 'Disparos concluidos');
  };

  const aprovarEDisparar = () => {
    const pendentes = selecionados.filter((i) => i.status_item === 'pendente').map((i) => i.id);
    const aprovados = selecionados.filter((i) => i.status_item === 'aprovado').map((i) => i.id);
    const todos = [...new Set([...pendentes, ...aprovados])];
    if (!todos.length) { toast({ title: 'Nenhum selecionado' }); return; }
    void agir('aprovar-disparar-lote', async () => {
      if (pendentes.length) await aprovarContatoProativoEmLote(pendentes, autor);
      await dispararContatoProativoEmLote({ itemIds: todos, autor, intervaloMs: intervaloSegundos * 1000 });
    }, 'Aprovacao e disparo concluidos');
  };

  const regenerar = () => void agir('gerar', async () => {
    const data = await gerarContatoProativo(criterios);
    setSnapshot(data);
  }, 'Fila regenerada');

  const aprovarItem = (id: number) => void agir(`aprovar-${id}`, () => aprovarContatoProativo(id, autor), 'Aprovado');
  const adiarItem = (id: number) => void agir(`adiar-${id}`, () => adiarContatoProativo(id, autor, diasAdiar), `Adiado ${diasAdiar} dia(s)`);
  const dispararItem = (id: number) => void agir(`disparar-${id}`, () => dispararContatoProativo(id, autor), 'Mensagem enviada');

  const totalEmCarga = itensBrutos.filter((i) => i.em_carga).length;
  const totalPadrao = itensBrutos.filter((i) => !i.em_carga).length;
  const diasCoberturaEstimado = criterios.limite && itensBrutos.length
    ? Math.ceil(itensBrutos.length / criterios.limite)
    : null;

  return {
    snapshot, historico, loading, busy,
    selectedIds, itensFiltrados, itensBrutos, selecionados,
    filtros, setFiltros,
    criterios, setCriterios,
    diasAdiar, setDiasAdiar,
    intervaloSegundos, setIntervaloSegundos,
    toggleItem, toggleTodos,
    aprovarSelecionados, adiarSelecionados, dispararSelecionados, aprovarEDisparar,
    aprovarItem, adiarItem, dispararItem,
    regenerar, carregar,
    totalEmCarga, totalPadrao, diasCoberturaEstimado,
  };
}
