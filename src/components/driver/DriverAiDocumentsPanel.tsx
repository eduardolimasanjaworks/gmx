/**
 * Painel do card do motorista para arquivos originais e sugestoes OCR.
 * Centraliza fetch, aprovacao parcial e auditoria sem inflar a view principal.
 * A interface continua humana: a IA sugere e a equipe decide o que aplicar.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { directusUrl } from "@/lib/directus";
import { FileText, Loader2, X } from "lucide-react";
import {
  buildSuggestionDiffRows,
  DriverAiSuggestionDiff,
  parseSuggestionJson,
} from "@/components/driver/DriverAiSuggestionDiff";
import { DriverAiOriginalFilesList } from "@/components/driver/DriverAiOriginalFilesList";
import { DriverAiSuggestionHistory } from "@/components/driver/DriverAiSuggestionHistory";
import { DriverAiSuggestionReviewDialog } from "@/components/driver/DriverAiSuggestionReviewDialog";
import type { ArquivoOriginal, SugestaoOcr } from "@/components/driver/DriverAiSuggestionModels";

interface DriverAiDocumentsPanelProps {
  motoristaId: number | string;
  telefone?: string;
  adminToken: string;
  onUpdated?: () => void;
}

function pickPatch(source: Record<string, unknown>, prefix: string, selectedKeys: string[]) {
  return Object.fromEntries(
    Object.entries(source).filter(([field]) => selectedKeys.includes(`${prefix}.${field}`)),
  );
}

export function DriverAiDocumentsPanel({ motoristaId, telefone, adminToken, onUpdated }: DriverAiDocumentsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [arquivos, setArquivos] = useState<ArquivoOriginal[]>([]);
  const [sugestoes, setSugestoes] = useState<SugestaoOcr[]>([]);
  const [motoristaAtual, setMotoristaAtual] = useState<Record<string, unknown>>({});
  const [docsAtuais, setDocsAtuais] = useState<Record<string, Record<string, unknown>>>({});
  const [reviewItem, setReviewItem] = useState<SugestaoOcr | null>(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" }), [adminToken]);
  const reviewerLabel = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Equipe GMX";

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(`${directusUrl}${path}`, {
      ...init,
      headers: { ...(init?.body ? headers : { Authorization: headers.Authorization }), ...(init?.headers || {}) },
    });
    if (!response.ok) throw new Error(await response.text());
    if (response.status === 204) return { data: null };
    return response.json();
  }

  async function carregar() {
    setLoading(true);
    try {
      const [originais, items, motorista] = await Promise.all([
        api(`/items/motorista_arquivo_original?filter[motorista_id][_eq]=${motoristaId}&sort=-date_created&limit=20`),
        api(`/items/motorista_ocr_sugestao?filter[motorista_id][_eq]=${motoristaId}&sort=-date_created&limit=20`),
        api(`/items/cadastro_motorista/${motoristaId}`),
      ]);
      const colecoes = Array.from(new Set((items.data || []).map((item: SugestaoOcr) => String(item.colecao_destino || "").trim()).filter(Boolean)));
      const docs = await Promise.all(colecoes.map(async (colecao) => {
        const resp = await api(`/items/${colecao}?filter[motorista_id][_eq]=${motoristaId}&sort=-date_created&limit=1`);
        return [colecao, resp.data?.[0] || {}] as const;
      }));
      setArquivos(originais.data || []);
      setSugestoes(items.data || []);
      setMotoristaAtual(motorista.data || {});
      setDocsAtuais(Object.fromEntries(docs));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void carregar(); }, [motoristaId]);

  async function atualizarSugestao(id: number, body: Record<string, unknown>) {
    await api(`/items/motorista_ocr_sugestao/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  }

  async function aplicarSelecionados(selectedKeys: string[]) {
    if (!reviewItem) return;
    setWorkingId(`aceitar-${reviewItem.id}`);
    try {
      const colecao = String(reviewItem.colecao_destino || "").trim();
      const rows = buildSuggestionDiffRows({
        currentMotorista: motoristaAtual,
        currentDocumento: docsAtuais[colecao] || {},
        sugestaoMotorista: reviewItem.sugestao_motorista,
        sugestaoDocumento: reviewItem.sugestao_documento,
      });
      const motoristaPatch = pickPatch(parseSuggestionJson(reviewItem.sugestao_motorista), "Motorista", selectedKeys);
      const documentoPatch = pickPatch(parseSuggestionJson(reviewItem.sugestao_documento), "Documento", selectedKeys);
      if (Object.keys(motoristaPatch).length > 0) {
        await api(`/items/cadastro_motorista/${motoristaId}`, { method: "PATCH", body: JSON.stringify(motoristaPatch) });
      }
      if (colecao && Object.keys(documentoPatch).length > 0) {
        const atual = docsAtuais[colecao]?.id
          ? docsAtuais[colecao]
          : (await api(`/items/${colecao}?filter[motorista_id][_eq]=${motoristaId}&sort=-date_created&limit=1`)).data?.[0];
        const payload = { ...documentoPatch, motorista_id: String(motoristaId), telefone: telefone || null, link: reviewItem.link || null };
        await api(atual?.id ? `/items/${colecao}/${atual.id}` : `/items/${colecao}`, { method: atual?.id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      }
      const allKeys = rows.map((row) => row.key);
      await atualizarSugestao(reviewItem.id, {
        status: selectedKeys.length === allKeys.length ? "aceita" : "aceita_parcial",
        aplicada_em: new Date().toISOString(),
        revisada_em: new Date().toISOString(),
        revisada_por_id: user?.id || null,
        revisada_por_nome: reviewerLabel,
        revisada_por_email: user?.email || null,
        campos_aplicados: JSON.stringify(selectedKeys),
        campos_rejeitados: JSON.stringify(allKeys.filter((key) => !selectedKeys.includes(key))),
      });
      setReviewItem(null);
      await carregar();
      onUpdated?.();
      toast({ title: "Sugestao aplicada", description: `${selectedKeys.length} campo(s) confirmados pela equipe.` });
    } catch (error) {
      toast({ title: "Falha ao aplicar sugestao", description: String(error), variant: "destructive" });
    } finally {
      setWorkingId("");
    }
  }

  async function rejeitarSugestao(item: SugestaoOcr) {
    setWorkingId(`rejeitar-${item.id}`);
    try {
      const rows = buildSuggestionDiffRows({
        currentMotorista: motoristaAtual,
        currentDocumento: docsAtuais[String(item.colecao_destino || "").trim()] || {},
        sugestaoMotorista: item.sugestao_motorista,
        sugestaoDocumento: item.sugestao_documento,
      });
      await atualizarSugestao(item.id, {
        status: "rejeitada",
        rejeitada_em: new Date().toISOString(),
        revisada_em: new Date().toISOString(),
        revisada_por_id: user?.id || null,
        revisada_por_nome: reviewerLabel,
        revisada_por_email: user?.email || null,
        campos_aplicados: JSON.stringify([]),
        campos_rejeitados: JSON.stringify(rows.map((row) => row.key)),
      });
      await carregar();
    } finally {
      setWorkingId("");
    }
  }

  async function apagarArquivo(item: ArquivoOriginal) {
    setWorkingId(`apagar-${item.id}`);
    try {
      const relacionadas = await api(`/items/motorista_ocr_sugestao?filter[arquivo_original_id][_eq]=${item.id}&fields=id`);
      for (const sugestao of relacionadas.data || []) await api(`/items/motorista_ocr_sugestao/${sugestao.id}`, { method: "DELETE" });
      await api(`/items/motorista_arquivo_original/${item.id}`, { method: "DELETE" });
      if (item.asset_id) await fetch(`${directusUrl}/files/${item.asset_id}`, { method: "DELETE", headers: { Authorization: headers.Authorization } }).catch(() => undefined);
      await carregar();
      onUpdated?.();
    } finally {
      setWorkingId("");
    }
  }

  const currentReviewDoc = docsAtuais[String(reviewItem?.colecao_destino || "").trim()] || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" />Arquivos da IA e Sugestoes OCR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <div className="text-sm text-muted-foreground">Carregando arquivos e sugestoes...</div>}
        <div className="space-y-3">
          <div className="text-sm font-semibold">Sugestoes pendentes</div>
          {sugestoes.filter((item) => item.status === "pendente").length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma sugestao pendente para este motorista.</div>
          )}
          {sugestoes.filter((item) => item.status === "pendente").map((item) => (
            <div key={item.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Badge variant="secondary">{item.tipo_documento || "documento"}</Badge><Badge>{item.colecao_destino || "sem destino"}</Badge></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setReviewItem(item)} disabled={!!workingId}>Revisar</Button>
                  <Button size="sm" variant="outline" onClick={() => void rejeitarSugestao(item)} disabled={!!workingId}>
                    {workingId === `rejeitar-${item.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              {item.link && <Button variant="link" className="h-auto p-0" onClick={() => window.open(item.link, "_blank")}>Abrir arquivo original</Button>}
              <DriverAiSuggestionDiff
                currentMotorista={motoristaAtual}
                currentDocumento={docsAtuais[String(item.colecao_destino || "").trim()] || {}}
                sugestaoMotorista={item.sugestao_motorista}
                sugestaoDocumento={item.sugestao_documento}
              />
            </div>
          ))}
        </div>
        <DriverAiSuggestionHistory sugestoes={sugestoes} />
        <DriverAiOriginalFilesList arquivos={arquivos} workingId={workingId} onDelete={(item) => void apagarArquivo(item)} />
        <DriverAiSuggestionReviewDialog
          open={!!reviewItem}
          item={reviewItem}
          currentMotorista={motoristaAtual}
          currentDocumento={currentReviewDoc}
          reviewerLabel={reviewerLabel}
          working={!!workingId}
          onOpenChange={(open) => !open && setReviewItem(null)}
          onConfirm={(selectedKeys) => void aplicarSelecionados(selectedKeys)}
        />
      </CardContent>
    </Card>
  );
}
