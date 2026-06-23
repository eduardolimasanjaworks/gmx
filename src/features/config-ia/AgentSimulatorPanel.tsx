import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CirclePause,
  Database,
  Gauge,
  Play,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  PROMPT_INVENTORY_ITEMS,
  SIMULATED_CONVERSATIONS,
  SIMULATOR_PRIORITY_ITEMS,
  type SimulatorConversation,
  type SimulatorMessage,
} from "./agent-simulator-data";
import {
  fetchIagmxOrchestratorSnapshot,
  updateIagmxMensagensFluxo,
  updateIagmxOrquestracaoTexto,
} from "@/services/iagmxOrchestratorService";

const SPEED_OPTIONS = [
  { value: "0.75", label: "0,75x" },
  { value: "1", label: "1x" },
  { value: "1.5", label: "1,5x" },
  { value: "2", label: "2x" },
];

const TICK_MS = 250;

function formatClock(startedAt: string, offsetMs: number): string {
  const date = new Date(new Date(startedAt).getTime() + offsetMs);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getLastOffset(conversation: SimulatorConversation): number {
  return conversation.messages[conversation.messages.length - 1]?.offsetMs ?? 0;
}

function getVisibleMessages(conversation: SimulatorConversation, elapsedMs: number): SimulatorMessage[] {
  return conversation.messages.filter((message) => message.offsetMs <= elapsedMs);
}

function getNextMessage(conversation: SimulatorConversation, elapsedMs: number): SimulatorMessage | undefined {
  return conversation.messages.find((message) => message.offsetMs > elapsedMs);
}

function getDefaultSelectedMessage(messages: SimulatorMessage[]): SimulatorMessage | undefined {
  return [...messages].reverse().find((message) => message.role === "assistant");
}

function previewDiff(text: string | null | undefined): string {
  if (!text) return "vazio";
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}

export function AgentSimulatorPanel() {
  const { toast } = useToast();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState("1");
  const [selectedMessageIds, setSelectedMessageIds] = useState<Record<string, string>>({});
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [camadaHumanaDraft, setCamadaHumanaDraft] = useState("");
  const [instrucaoFormatacaoDraft, setInstrucaoFormatacaoDraft] = useState("");
  const [savingOrquestracao, setSavingOrquestracao] = useState(false);
  const [mensagensFluxoDraft, setMensagensFluxoDraft] = useState("");
  const [savingMensagensFluxo, setSavingMensagensFluxo] = useState(false);
  const orchestratorQuery = useQuery({
    queryKey: ["iagmx-orchestrator-snapshot"],
    queryFn: fetchIagmxOrchestratorSnapshot,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: (prev) => prev,
  });

  const maxDuration = useMemo(
    () => Math.max(...SIMULATED_CONVERSATIONS.map((conversation) => getLastOffset(conversation)), 0),
    [],
  );

  useEffect(() => {
    if (!isRunning) return;
    if (elapsedMs >= maxDuration) {
      setIsRunning(false);
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedMs((current) => {
        const next = current + TICK_MS * Number(speed);
        return next >= maxDuration ? maxDuration : next;
      });
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [elapsedMs, isRunning, maxDuration, speed]);

  useEffect(() => {
    if (!carouselApi) return;

    const sync = () => setActiveIndex(carouselApi.selectedScrollSnap());
    sync();
    carouselApi.on("select", sync);
    carouselApi.on("reInit", sync);

    return () => {
      carouselApi.off("select", sync);
    };
  }, [carouselApi]);

  useEffect(() => {
    const remota = orchestratorQuery.data?.orquestracaoTexto?.config;
    if (!remota) return;
    setCamadaHumanaDraft((current) => current || remota.camadaHumana);
    setInstrucaoFormatacaoDraft((current) => current || remota.instrucaoFormatacao);
  }, [orchestratorQuery.data?.orquestracaoTexto]);

  useEffect(() => {
    const remotas = orchestratorQuery.data?.mensagensFluxo?.config;
    if (!remotas) return;
    setMensagensFluxoDraft((current) => current || JSON.stringify(remotas, null, 2));
  }, [orchestratorQuery.data?.mensagensFluxo]);

  const totalVisibleMessages = useMemo(
    () =>
      SIMULATED_CONVERSATIONS.reduce(
        (count, conversation) => count + getVisibleMessages(conversation, elapsedMs).length,
        0,
      ),
    [elapsedMs],
  );

  const totalToolActivations = useMemo(
    () =>
      SIMULATED_CONVERSATIONS.reduce(
        (count, conversation) =>
          count +
          getVisibleMessages(conversation, elapsedMs).reduce(
            (inner, message) => inner + (message.audit?.tools.length ?? 0),
            0,
          ),
        0,
      ),
    [elapsedMs],
  );

  const totalErpWrites = useMemo(
    () =>
      SIMULATED_CONVERSATIONS.reduce(
        (count, conversation) =>
          count +
          getVisibleMessages(conversation, elapsedMs).reduce(
            (inner, message) => inner + (message.audit?.erpWrites.length ?? 0),
            0,
          ),
        0,
      ),
    [elapsedMs],
  );

  const globalProgress = maxDuration > 0 ? (elapsedMs / maxDuration) * 100 : 0;
  const liveTraceCount = orchestratorQuery.data?.pipeline?.traces.length ?? 0;
  const promptSistemaChars = orchestratorQuery.data?.promptSistema?.caracteres ?? 0;
  const promptOcrChars = orchestratorQuery.data?.promptOcr?.prompt.length ?? 0;
  const promptOcrForcadoChars = orchestratorQuery.data?.promptOcr?.promptForcado?.length ?? 0;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  MVP visual
                </Badge>
                <Badge variant="outline">Dados guiados pelos fluxos reais</Badge>
              </div>
              <div>
                <CardTitle className="text-xl">Simulador do agente de IA</CardTitle>
                <CardDescription className="mt-1 max-w-3xl">
                  Primeira versão funcional para validar a direção do produto, com carrossel de chats,
                  progressão quase em tempo real e auditoria completa por mensagem da IA
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={speed} onValueChange={setSpeed}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Velocidade" />
                </SelectTrigger>
                <SelectContent>
                  {SPEED_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setIsRunning(true)} disabled={isRunning || elapsedMs >= maxDuration} className="gap-2">
                <Play className="h-4 w-4" />
                Executar
              </Button>
              <Button variant="outline" onClick={() => setIsRunning(false)} disabled={!isRunning} className="gap-2">
                <CirclePause className="h-4 w-4" />
                Pausar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setElapsedMs(0);
                  setIsRunning(true);
                  setSelectedMessageIds({});
                }}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reiniciar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard
              icon={Bot}
              label="Chats simulados"
              value={String(SIMULATED_CONVERSATIONS.length)}
              help="Rotinas core já mapeadas"
            />
            <MetricCard
              icon={Gauge}
              label="Mensagens visíveis"
              value={String(totalVisibleMessages)}
              help="Mensagens já reproduzidas no tempo atual"
            />
            <MetricCard
              icon={WandSparkles}
              label="Tools acionadas"
              value={String(totalToolActivations)}
              help="Tools reveladas nas conversas"
            />
            <MetricCard
              icon={Database}
              label="Escritas ERP"
              value={String(totalErpWrites)}
              help="Registros persistidos na simulação"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Andamento global da simulação</span>
              <span>{globalProgress.toFixed(0)}%</span>
            </div>
            <Progress value={globalProgress} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backend real e inventário de prompts</CardTitle>
          <CardDescription>
            Leitura ao vivo dos prompts e traces do iagmx, junto com o mapa do que já é orquestrável e do que ainda está hardcoded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-3">
            <LivePromptCard
              title="Prompt principal"
              source="Postgres"
              isConnected={Boolean(orchestratorQuery.data?.promptSistema)}
              loading={orchestratorQuery.isLoading}
              chars={promptSistemaChars}
              updatedAt={orchestratorQuery.data?.promptSistema?.atualizadoEm ?? null}
              detail="Editável hoje via /api/prompt"
            />
            <LivePromptCard
              title="Prompt OCR"
              source="Postgres"
              isConnected={Boolean(orchestratorQuery.data?.promptOcr)}
              loading={orchestratorQuery.isLoading}
              chars={promptOcrChars}
              updatedAt={orchestratorQuery.data?.promptOcr?.atualizadoEm ?? null}
              detail="Editável hoje via /api/config/ocr"
            />
            <LivePromptCard
              title="OCR forçado"
              source="Postgres"
              isConnected={Boolean(orchestratorQuery.data?.promptOcr?.promptForcado)}
              loading={orchestratorQuery.isLoading}
              chars={promptOcrForcadoChars}
              updatedAt={orchestratorQuery.data?.promptOcr?.atualizadoEmForcado ?? null}
              detail="Retry de OCR persistido no backend"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <LivePromptCard
              title="Mensagens de fluxo"
              source="Postgres"
              isConnected={Boolean(orchestratorQuery.data?.mensagensFluxo)}
              loading={orchestratorQuery.isLoading}
              chars={Object.keys(orchestratorQuery.data?.mensagensFluxo?.config ?? {}).length}
              updatedAt={orchestratorQuery.data?.mensagensFluxo?.atualizadoEm ?? null}
              detail="C7, C8, atualização documental e OCR humano"
              suffix="chaves"
            />
            <LivePromptCard
              title="Pipeline visível"
              source="Redis + API"
              isConnected={Boolean(orchestratorQuery.data?.pipeline)}
              loading={orchestratorQuery.isLoading}
              chars={liveTraceCount}
              updatedAt={null}
              detail={
                orchestratorQuery.data?.pipeline
                  ? `Build ${orchestratorQuery.data.pipeline.build}`
                  : "Sem resposta do endpoint /api/pipeline/traces"
              }
              suffix="traces"
            />
          </div>

          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Editor de orquestração textual</CardTitle>
              <CardDescription>
                Primeira etapa para remover texto sensível do código e passar a operar essas camadas pelo portal
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">Camada humana</div>
                <Textarea
                  value={camadaHumanaDraft}
                  onChange={(event) => setCamadaHumanaDraft(event.target.value)}
                  className="min-h-[280px] font-mono text-xs"
                  placeholder="Regras de tom, postura, desambiguação e comportamento"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Instrução de formatação WhatsApp</div>
                <Textarea
                  value={instrucaoFormatacaoDraft}
                  onChange={(event) => setInstrucaoFormatacaoDraft(event.target.value)}
                  className="min-h-[280px] font-mono text-xs"
                  placeholder="Regras de linha única, vírgulas, sem ponto final e estilo de bolhas"
                />
              </div>
              <div className="xl:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  Ao salvar, essas duas camadas passam a ser lidas do Postgres pelo backend, com efeito imediato nas próximas inferências
                </div>
                <Button
                  onClick={async () => {
                    try {
                      setSavingOrquestracao(true);
                      const result = await updateIagmxOrquestracaoTexto({
                        camadaHumana: camadaHumanaDraft,
                        instrucaoFormatacao: instrucaoFormatacaoDraft,
                      });
                      toast({
                        title: "Orquestração atualizada",
                        description: result.mensagem || "Textos salvos com sucesso",
                      });
                      await orchestratorQuery.refetch();
                    } catch (error) {
                      toast({
                        title: "Erro ao salvar",
                        description: error instanceof Error ? error.message : "Falha ao persistir a configuração",
                        variant: "destructive",
                      });
                    } finally {
                      setSavingOrquestracao(false);
                    }
                  }}
                  disabled={savingOrquestracao}
                >
                  {savingOrquestracao ? "Salvando..." : "Salvar textos de orquestração"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Editor de mensagens de fluxo</CardTitle>
              <CardDescription>
                Editor inicial em JSON para as mensagens fixas dos fluxos programáticos e das respostas humanas de OCR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={mensagensFluxoDraft}
                onChange={(event) => setMensagensFluxoDraft(event.target.value)}
                className="min-h-[360px] font-mono text-xs"
                placeholder='{"c7_pergunta_status":"..."}'
              />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  Salve um JSON válido para alterar textos operacionais sem deploy, incluindo C7, C8, atualização documental e OCR humano
                </div>
                <Button
                  onClick={async () => {
                    try {
                      setSavingMensagensFluxo(true);
                      const parsed = JSON.parse(mensagensFluxoDraft) as Record<string, string | string[]>;
                      const result = await updateIagmxMensagensFluxo(parsed);
                      toast({
                        title: "Mensagens de fluxo atualizadas",
                        description: result.mensagem || "Mensagens salvas com sucesso",
                      });
                      await orchestratorQuery.refetch();
                    } catch (error) {
                      toast({
                        title: "Erro ao salvar mensagens",
                        description:
                          error instanceof Error ? error.message : "Falha ao persistir as mensagens de fluxo",
                        variant: "destructive",
                      });
                    } finally {
                      setSavingMensagensFluxo(false);
                    }
                  }}
                  disabled={savingMensagensFluxo}
                >
                  {savingMensagensFluxo ? "Salvando..." : "Salvar mensagens de fluxo"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico recente de configuração</CardTitle>
              <CardDescription>
                Primeira entrega do versionamento, mostrando alterações recentes com antes e depois das configurações editáveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orchestratorQuery.data?.historicoConfiguracao?.length ? (
                <ScrollArea className="h-[360px] pr-3">
                  <div className="space-y-3">
                    {orchestratorQuery.data.historicoConfiguracao.map((item) => (
                      <div key={item.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{item.chave}</Badge>
                            <Badge variant="outline">{item.origem}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.criadoEm).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 xl:grid-cols-2">
                          <div className="rounded-lg border bg-muted/20 p-3">
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Antes
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {previewDiff(item.antes)}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-muted/20 p-3">
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Depois
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {previewDiff(item.depois)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Ainda nao ha alteracoes registradas nesse historico ou o endpoint ainda nao respondeu
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Diagnóstico atual de orquestração</div>
                <p className="text-muted-foreground">
                  O núcleo dos prompts, do retry OCR e das mensagens operacionais já está migrando para o Postgres, mas ainda existem trechos fixos no código em partes residuais dos fluxos e em validações auxiliares
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div className="text-sm font-medium">Inventário de editabilidade</div>
              <div className="grid gap-2 md:grid-cols-2">
                {PROMPT_INVENTORY_ITEMS.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.title}</div>
                      <Badge
                        variant={
                          item.status === "postgres"
                            ? "default"
                            : item.status === "hibrido"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{item.location}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Traces recentes do backend</div>
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  {orchestratorQuery.data?.pipeline?.traces?.length ? (
                    <ScrollArea className="h-[360px] pr-3">
                      <div className="space-y-3">
                        {orchestratorQuery.data.pipeline.traces.map((trace) => (
                          <div key={trace.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{trace.status}</Badge>
                                <Badge variant="outline">{trace.id}</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(trace.inicioMs).toLocaleTimeString("pt-BR")}
                              </span>
                            </div>
                            <div className="mt-2 text-sm">
                              <div className="font-medium">Entrada</div>
                              <p className="text-muted-foreground">{trace.entrada}</p>
                            </div>
                            <div className="mt-2 text-sm">
                              <div className="font-medium">Etapas</div>
                              <p className="text-muted-foreground">
                                {trace.etapas.map((stage) => stage.etapa).join(" -> ")}
                              </p>
                            </div>
                            {trace.resposta && (
                              <div className="mt-2 text-sm">
                                <div className="font-medium">Resposta</div>
                                <p className="text-muted-foreground">{trace.resposta}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {orchestratorQuery.isLoading
                        ? "Carregando traces reais do iagmx"
                        : "Nao consegui ler traces reais agora, o simulador segue com os roteiros locais"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Escopo core priorizado</CardTitle>
          <CardDescription>
            Lista enxuta do primeiro ciclo, mantendo o foco no que entrega validação rápida e auditável
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {SIMULATOR_PRIORITY_ITEMS.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"
              >
                <span className="text-sm leading-5">{item.label}</span>
                <Badge variant={item.priority === "P1" ? "default" : "outline"}>{item.priority}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {SIMULATED_CONVERSATIONS.map((conversation, index) => {
            const isActive = index === activeIndex;
            const conversationProgress =
              getLastOffset(conversation) > 0 ? Math.min(100, (elapsedMs / getLastOffset(conversation)) * 100) : 0;

            return (
              <Button
                key={conversation.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="justify-start gap-2"
                onClick={() => carouselApi?.scrollTo(index)}
              >
                <span>{conversation.title}</span>
                <Badge variant={isActive ? "secondary" : "outline"}>{conversationProgress.toFixed(0)}%</Badge>
              </Button>
            );
          })}
        </div>

        <Carousel setApi={setCarouselApi} opts={{ align: "start", loop: false }} className="px-10">
          <CarouselContent>
            {SIMULATED_CONVERSATIONS.map((conversation) => {
              const visibleMessages = getVisibleMessages(conversation, elapsedMs);
              const defaultSelected = getDefaultSelectedMessage(visibleMessages);
              const selectedMessage =
                visibleMessages.find((message) => message.id === selectedMessageIds[conversation.id]) ??
                defaultSelected;

              return (
                <CarouselItem key={conversation.id}>
                  <ConversationSlide
                    conversation={conversation}
                    elapsedMs={elapsedMs}
                    visibleMessages={visibleMessages}
                    selectedMessage={selectedMessage}
                    onSelectMessage={(messageId) =>
                      setSelectedMessageIds((current) => ({
                        ...current,
                        [conversation.id]: messageId,
                      }))
                    }
                  />
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  );
}

function LivePromptCard({
  title,
  source,
  isConnected,
  loading,
  chars,
  updatedAt,
  detail,
  suffix = "chars",
}: {
  title: string;
  source: string;
  isConnected: boolean;
  loading: boolean;
  chars: number;
  updatedAt: string | null;
  detail: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{source}</div>
        </div>
        <Badge variant={isConnected ? "default" : "outline"}>
          {loading ? "lendo" : isConnected ? "conectado" : "indisponivel"}
        </Badge>
      </div>
      <div className="mt-3 text-2xl font-semibold">
        {loading ? "..." : `${chars} ${suffix}`}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {updatedAt ? `Atualizado em ${new Date(updatedAt).toLocaleString("pt-BR")}` : "Sem carimbo remoto"}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  help,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{help}</div>
    </div>
  );
}

function ConversationSlide({
  conversation,
  elapsedMs,
  visibleMessages,
  selectedMessage,
  onSelectMessage,
}: {
  conversation: SimulatorConversation;
  elapsedMs: number;
  visibleMessages: SimulatorMessage[];
  selectedMessage?: SimulatorMessage;
  onSelectMessage: (messageId: string) => void;
}) {
  const nextMessage = getNextMessage(conversation, elapsedMs);
  const progress = getLastOffset(conversation) > 0 ? Math.min(100, (elapsedMs / getLastOffset(conversation)) * 100) : 0;
  const revealedToolEvents = visibleMessages.flatMap((message) =>
    (message.audit?.tools ?? []).map((tool) => ({
      time: formatClock(conversation.startedAt, message.offsetMs),
      text: tool,
      messageText: message.text,
    })),
  );
  const revealedErpWrites = visibleMessages.flatMap((message) =>
    (message.audit?.erpWrites ?? []).map((write) => ({
      time: formatClock(conversation.startedAt, message.offsetMs),
      text: write,
      messageText: message.text,
    })),
  );

  return (
    <Card className="min-h-[760px] border-primary/10">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{conversation.title}</CardTitle>
              <Badge variant="secondary">{conversation.routine}</Badge>
              <Badge variant="outline">{conversation.source}</Badge>
            </div>
            <CardDescription className="max-w-3xl">{conversation.summary}</CardDescription>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{conversation.driverName}</span>
              <span className="ml-2">{conversation.driverPhone}</span>
            </div>
            <div>Resultado esperado: {conversation.expectedOutcome}</div>
            <div>
              {nextMessage
                ? `Próximo evento em ${Math.max(0, (nextMessage.offsetMs - elapsedMs) / 1000).toFixed(1)}s`
                : "Fluxo concluído no simulador"}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Execução desta rotina</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conversa simulada</CardTitle>
            <CardDescription>
              Clique em uma mensagem da IA para abrir a auditoria detalhada daquela resposta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[560px] pr-3">
              <div className="space-y-3">
                {visibleMessages.map((message) => {
                  const isAssistant = message.role === "assistant";
                  const isSelected = selectedMessage?.id === message.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isAssistant) onSelectMessage(message.id);
                        }}
                        className={`max-w-[85%] rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                          isAssistant
                            ? isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-muted/40 hover:border-primary/40"
                            : "border-primary/20 bg-primary text-primary-foreground"
                        } ${isAssistant ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                            {message.author}
                          </span>
                          <span className="text-[11px] opacity-70">
                            {formatClock(conversation.startedAt, message.offsetMs)}
                          </span>
                        </div>
                        <div className="text-sm leading-6">{message.text}</div>
                        {message.audit && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="outline">Motivo</Badge>
                            <Badge variant="outline">Condição SE</Badge>
                            <Badge variant="outline">Prompt</Badge>
                            {message.audit.tools.length > 0 && <Badge variant="outline">Tool</Badge>}
                            {message.audit.erpWrites.length > 0 && <Badge variant="outline">ERP</Badge>}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Auditoria da mensagem selecionada</CardTitle>
              <CardDescription>
                Motivo, condição, justificativa, referências e prompt completo da resposta da IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedMessage?.audit ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Badge variant="secondary">{formatClock(conversation.startedAt, selectedMessage.offsetMs)}</Badge>
                      <span className="text-xs text-muted-foreground">Mensagem visível ao motorista</span>
                    </div>
                    <p className="text-sm leading-6">{selectedMessage.text}</p>
                  </div>

                  <AuditField label="Motivo">{selectedMessage.audit.reason}</AuditField>
                  <AuditField label="Condição SE">{selectedMessage.audit.ifClause}</AuditField>
                  <AuditField label="Justificativa do acionamento">
                    {selectedMessage.audit.whyTriggered}
                  </AuditField>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Referências usadas</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMessage.audit.references.map((reference) => (
                        <Badge key={reference} variant="outline">
                          {reference}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Prompt completo da simulação</div>
                    <ScrollArea className="h-[250px] rounded-lg border bg-black/[0.02] p-3">
                      <pre className="whitespace-pre-wrap text-xs leading-5 text-foreground/90">
                        {selectedMessage.audit.prompt}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Aguarde a primeira mensagem da IA aparecer ou selecione um chat que já esteja com resposta visível
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tools acionadas na conversa</CardTitle>
              <CardDescription>
                Todas as ativações reveladas até o instante atual, com o contexto de cada disparo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revealedToolEvents.length > 0 ? (
                <ScrollArea className="h-[180px] pr-3">
                  <div className="space-y-3">
                    {revealedToolEvents.map((event, index) => (
                      <div key={`${event.time}-${event.text.tool}-${index}`} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <Badge>{event.text.tool}</Badge>
                          <span className="text-xs text-muted-foreground">{event.time}</span>
                        </div>
                        <div className="mt-2 text-sm">
                          <div className="font-medium">Contexto</div>
                          <p className="text-muted-foreground">{event.text.context}</p>
                        </div>
                        <div className="mt-2 text-sm">
                          <div className="font-medium">Resultado</div>
                          <p className="text-muted-foreground">{event.text.result}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma tool foi acionada ainda nesta rotina</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Escritas realizadas no ERP</CardTitle>
              <CardDescription>
                Log exato do que a IA inseriu ou atualizou no sistema durante a simulação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revealedErpWrites.length > 0 ? (
                <ScrollArea className="h-[200px] pr-3">
                  <div className="space-y-3">
                    {revealedErpWrites.map((event, index) => (
                      <div key={`${event.time}-${event.text.entity}-${index}`} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{event.text.entity}</Badge>
                            <Badge variant="outline">{event.text.action}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{event.time}</span>
                        </div>
                        <div className="mt-2 text-sm">
                          <div className="font-medium">Payload registrado</div>
                          <p className="text-muted-foreground">{event.text.payload}</p>
                        </div>
                        <div className="mt-2 text-sm">
                          <div className="font-medium">Resultado</div>
                          <p className="text-muted-foreground">{event.text.result}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma escrita no ERP foi revelada ainda nesta rotina</p>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditField({ label, children }: { label: string; children: string }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="rounded-lg border bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
