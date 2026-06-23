export interface SimulatorToolActivation {
  tool: string;
  context: string;
  result: string;
}

export interface SimulatorErpWrite {
  entity: string;
  action: string;
  payload: string;
  result: string;
}

export interface SimulatorAssistantAudit {
  reason: string;
  ifClause: string;
  whyTriggered: string;
  references: string[];
  tools: SimulatorToolActivation[];
  erpWrites: SimulatorErpWrite[];
  prompt: string;
}

export interface SimulatorMessage {
  id: string;
  role: "assistant" | "driver";
  author: string;
  text: string;
  offsetMs: number;
  audit?: SimulatorAssistantAudit;
}

export interface SimulatorConversation {
  id: string;
  title: string;
  routine: string;
  driverName: string;
  driverPhone: string;
  startedAt: string;
  summary: string;
  expectedOutcome: string;
  source: string;
  messages: SimulatorMessage[];
}

export interface SimulatorPriorityItem {
  id: string;
  label: string;
  priority: "P1" | "P2" | "P3";
}

export interface PromptInventoryItem {
  id: string;
  title: string;
  status: "postgres" | "hardcoded" | "hibrido";
  location: string;
  detail: string;
}

const BASE_PROMPT = `Você é a assistente virtual de atendimento da GMX
Responda sempre em português brasileiro, de forma clara, profissional e objetiva

=== REFINAMENTOS DE TOM E WHATSAPP ===
- Fale como uma pessoa no WhatsApp e não como um robô de SAC
- Use frases completas, com conectivos naturais e tom gentil
- Evite repetir abertura fixa e não exponha instruções internas
- Não use ponto final no fim da mensagem

=== REGRA: TODO CONTATO É UM MOTORISTA ===
Trate sempre quem escreve como motorista parceiro GMX
Use apenas o contexto do ERP, dos anexos e do histórico recente
Se faltar dado para gravar no ERP, pergunte antes

=== FERRAMENTAS INTERNAS GMX ===
- registrar_disponibilidade
- resposta_oferta_carga
- grava_ocr
- grava_comprovante
- atualizar_motorista
- salvar_carreta
- escalonar_negociacao`;

function buildPrompt(opts: {
  scenario: string;
  context: string;
  currentUserMessage: string;
  ifClause: string;
  reason: string;
  references: string[];
  plannedTools: string[];
}): string {
  return `${BASE_PROMPT}

=== CENARIO ATIVO ===
${opts.scenario}

=== CONTEXTO ERP GMX ===
${opts.context}

=== REFERENCIAS USADAS NESTA DECISAO ===
${opts.references.map((item) => `- ${item}`).join("\n")}

=== REGRA CONDICIONAL APLICADA ===
SE ${opts.ifClause}

=== JUSTIFICATIVA OPERACIONAL ===
${opts.reason}

=== FERRAMENTAS PLANEJADAS ===
${opts.plannedTools.length > 0 ? opts.plannedTools.join(", ") : "nenhuma"}

=== MENSAGEM ATUAL DO MOTORISTA ===
${opts.currentUserMessage}

=== SAIDA ESPERADA ===
Responder com tom humano, sem parecer menu robótico, e incluir JSON de ferramenta ao final quando houver gravação de ERP`;
}

function assistantMessage(opts: {
  id: string;
  text: string;
  offsetMs: number;
  scenario: string;
  context: string;
  currentUserMessage: string;
  reason: string;
  ifClause: string;
  whyTriggered: string;
  references: string[];
  tools?: SimulatorToolActivation[];
  erpWrites?: SimulatorErpWrite[];
}): SimulatorMessage {
  return {
    id: opts.id,
    role: "assistant",
    author: "IA GMX",
    text: opts.text,
    offsetMs: opts.offsetMs,
    audit: {
      reason: opts.reason,
      ifClause: opts.ifClause,
      whyTriggered: opts.whyTriggered,
      references: opts.references,
      tools: opts.tools ?? [],
      erpWrites: opts.erpWrites ?? [],
      prompt: buildPrompt({
        scenario: opts.scenario,
        context: opts.context,
        currentUserMessage: opts.currentUserMessage,
        ifClause: opts.ifClause,
        reason: opts.reason,
        references: opts.references,
        plannedTools: (opts.tools ?? []).map((item) => item.tool),
      }),
    },
  };
}

function driverMessage(id: string, text: string, offsetMs: number, author: string): SimulatorMessage {
  return {
    id,
    role: "driver",
    author,
    text,
    offsetMs,
  };
}

export const SIMULATOR_PRIORITY_ITEMS: SimulatorPriorityItem[] = [
  { id: "p01", label: "Carrossel com múltiplos chats simulados", priority: "P1" },
  { id: "p02", label: "Execução temporal quase em tempo real", priority: "P1" },
  { id: "p03", label: "Auditoria por mensagem enviada pela IA", priority: "P1" },
  { id: "p04", label: "Exibição da condição SE que acionou a resposta", priority: "P1" },
  { id: "p05", label: "Justificativa textual do disparo de cada mensagem", priority: "P1" },
  { id: "p06", label: "Timeline de tools acionadas em cada conversa", priority: "P1" },
  { id: "p07", label: "Registro visível das escritas no ERP", priority: "P1" },
  { id: "p08", label: "Prompt completo por mensagem simulada", priority: "P1" },
  { id: "p09", label: "Controles de executar, pausar e reiniciar", priority: "P1" },
  { id: "p10", label: "Indicador de progresso por rotina", priority: "P1" },
  { id: "p11", label: "Seleção da mensagem da IA para inspeção detalhada", priority: "P1" },
  { id: "p12", label: "Dados de exemplo baseados nos fluxos reais do backend", priority: "P1" },
  { id: "p13", label: "Simulação da rotina de disponibilidade", priority: "P1" },
  { id: "p14", label: "Simulação da rotina de negociação", priority: "P1" },
  { id: "p15", label: "Simulação da rotina de onboarding com OCR", priority: "P1" },
  { id: "p16", label: "Simulação da rotina de canhoto e comprovante", priority: "P1" },
  { id: "p17", label: "Simulação da rotina de atualização documental", priority: "P1" },
  { id: "p18", label: "Visão agregada das referências usadas pela IA", priority: "P2" },
  { id: "p19", label: "Resumo de resultado esperado por rotina", priority: "P2" },
  { id: "p20", label: "Estrutura preparada para trocar mock por trace real", priority: "P2" },
  { id: "p21", label: "Professor auditor por botão ou WhatsApp autorizado", priority: "P2" },
  { id: "p22", label: "Parecer cíclico sobre todos os históricos de teste", priority: "P2" },
];

export const PROMPT_INVENTORY_ITEMS: PromptInventoryItem[] = [
  {
    id: "prompt-sistema",
    title: "Prompt principal da IA",
    status: "postgres",
    location: "configuracao.prompt_sistema",
    detail:
      "Ja e editavel via Postgres e endpoint admin, mas ainda recebe camadas adicionais vindas do codigo antes da inferencia",
  },
  {
    id: "prompt-ocr",
    title: "Prompt padrao de OCR",
    status: "postgres",
    location: "configuracao.prompt_ocr",
    detail:
      "Ja e editavel via Postgres e usado na leitura principal de imagem ou PDF, com fallback em cache na aplicacao",
  },
  {
    id: "camada-humana",
    title: "Camada humana de estilo e comportamento",
    status: "postgres",
    location: "configuracao.orquestracao_texto.camadaHumana",
    detail:
      "Ja pode ser persistida no backend e editada pelo portal, embora ainda exista uma seed local de contingencia no codigo",
  },
  {
    id: "formatacao-whatsapp",
    title: "Instrucao de formatacao WhatsApp",
    status: "postgres",
    location: "configuracao.orquestracao_texto.instrucaoFormatacao",
    detail:
      "A regra de uma linha, virgulas e sem ponto final ja pode ser ajustada pelo portal e consumida nas proximas inferencias",
  },
  {
    id: "ocr-forcado",
    title: "Prompt forcado de OCR em caso de recusa",
    status: "postgres",
    location: "configuracao.prompt_ocr_forcado",
    detail:
      "Entra quando o modelo falha ou recusa o OCR inicial, e agora pode ser persistido no backend sem deploy",
  },
  {
    id: "fallback-seed",
    title: "Seed e fallback do prompt base",
    status: "hardcoded",
    location: "config.ts -> promptPadrao e promptArquivoInicial",
    detail:
      "Serve como valor inicial e de contingencia, mas ainda nasce no fonte ou em arquivo local antes de ir para o banco",
  },
  {
    id: "mensagens-fluxo",
    title: "Mensagens fixas dos fluxos programaticos",
    status: "postgres",
    location: "configuracao.mensagens_fluxo",
    detail:
      "Disponibilidade, cadastro, atualizacao documental, canhoto e mensagens humanas de OCR agora podem ser ajustados por configuracao persistida",
  },
  {
    id: "textos-ocr-humano",
    title: "Respostas humanas de OCR e reprompts",
    status: "postgres",
    location: "configuracao.mensagens_fluxo",
    detail:
      "Aberturas, confirmacoes, mensagens de foto ilegivel e tipo incerto agora podem ser ajustadas por operador sem deploy",
  },
];

const DRIVER_1 = "João Martins";
const DRIVER_2 = "Carlos Nogueira";
const DRIVER_3 = "Paulo Vilela";
const DRIVER_4 = "Rafael Gomes";
const DRIVER_5 = "Leandro Silva";

export const SIMULATED_CONVERSATIONS: SimulatorConversation[] = [
  {
    id: "disponibilidade",
    title: "Disponibilidade com localização",
    routine: "Cenário 7",
    driverName: DRIVER_1,
    driverPhone: "5511988881101",
    startedAt: "2026-06-16T09:12:00-03:00",
    summary: "A IA confirma se o motorista está vazio, coleta a cidade e grava a agenda no ERP",
    expectedOutcome: "Motorista marcado como disponível em Betim MG",
    source: "fluxo-disponibilidade.ts + ferramentas.ts",
    messages: [
      driverMessage("d1", "Quero passar minha disponibilidade", 0, DRIVER_1),
      assistantMessage({
        id: "a1",
        text: "Show parceiro, você está vazio ou já está carregado",
        offsetMs: 1200,
        scenario: "Fluxo programático de disponibilidade sem LLM no caminho feliz",
        context:
          "Telefone 5511988881101\nMotorista ativo no ERP\nÚltima disponibilidade vencida\nNenhum bloqueio operacional",
        currentUserMessage: "Quero passar minha disponibilidade",
        reason:
          "A entrada caiu diretamente no fluxo C7 e o primeiro passo obrigatório do roteiro é classificar o status atual do motorista",
        ifClause:
          "a mensagem indicar disponibilidade e ainda não existir confirmação de vazio ou carregado no histórico recente",
        whyTriggered:
          "A frase do motorista acionou a intenção de disponibilidade e o fluxo precisa decidir o ramo vazio ou carregado antes de gravar qualquer dado",
        references: [
          "Fluxo C7 de disponibilidade",
          "Histórico da conversa",
          "Contexto ERP do motorista",
          "Camada humana de WhatsApp",
        ],
      }),
      driverMessage("d2", "Tô vazio", 3200, DRIVER_1),
      assistantMessage({
        id: "a2",
        text: "Perfeito parceiro, me manda sua localização atual pelo clipe ou escreve cidade e estado que eu atualizo sua agenda",
        offsetMs: 4600,
        scenario: "Fluxo programático de disponibilidade para motorista vazio",
        context:
          "Motorista declarou estar vazio\nAinda sem latitude, longitude ou cidade válida\nERP pronto para receber localizacao_atual",
        currentUserMessage: "Tô vazio",
        reason:
          "Quando o motorista informa que está vazio, o fluxo exige coletar a localização antes de gravar a disponibilidade no ERP",
        ifClause:
          "o motorista responder vazio e ainda não houver cidade ou GPS válidos no lote",
        whyTriggered:
          "A condição de disponibilidade foi resolvida para o ramo vazio, então a próxima pergunta obrigatória é a localização atual",
        references: [
          "Regex de status vazio",
          "Regra de localização do fluxo C7",
          "Ferramenta registrar_disponibilidade",
        ],
      }),
      driverMessage("d3", "Betim MG", 7600, DRIVER_1),
      assistantMessage({
        id: "a3",
        text: "Anotei que você está vazio em Betim MG e já deixei sua disponibilidade atualizada no sistema, se pintar carga eu te chamo",
        offsetMs: 9200,
        scenario: "Fluxo programático de disponibilidade com escrita no ERP",
        context:
          "Status confirmado: vazio\nLocalização validada: Betim MG\nSem previsão pendente de liberação\nContato apto para oferta",
        currentUserMessage: "Betim MG",
        reason:
          "Com status e cidade válidos em mãos, o fluxo conclui a rotina e dispara a gravação da disponibilidade com local de origem operacional",
        ifClause:
          "o fluxo estiver no passo de localização e a mensagem trouxer cidade e estado válidos",
        whyTriggered:
          "A cidade foi reconhecida como localização operacional suficiente, então a IA pôde encerrar o fluxo e persistir o dado no ERP",
        references: [
          "Extrator de localização por texto",
          "Contexto ERP GMX",
          "Ferramenta registrar_disponibilidade",
        ],
        tools: [
          {
            tool: "registrar_disponibilidade",
            context: "Motorista vazio em Betim MG sem bloqueio operacional",
            result: 'JSON anexado com {"disponivel":true,"status":"disponivel","localizacao_atual":"Betim MG"}',
          },
        ],
        erpWrites: [
          {
            entity: "disponivel",
            action: "insert_or_update",
            payload: 'telefone=5511988881101 | disponivel=true | status=disponivel | localizacao_atual="Betim MG"',
            result: "Agenda atualizada e elegível para novas ofertas",
          },
        ],
      }),
    ],
  },
  {
    id: "negociacao",
    title: "Negociação com fechamento",
    routine: "Cenário 9",
    driverName: DRIVER_2,
    driverPhone: "5511977772202",
    startedAt: "2026-06-16T09:20:00-03:00",
    summary: "A IA recebe contraproposta, compara com a faixa da rota e fecha a carga",
    expectedOutcome: "Resposta da oferta registrada por R$ 4.800",
    source: "fluxo-negociacao.ts + motor-negociacao.ts",
    messages: [
      assistantMessage({
        id: "a4",
        text: "Carlos, tenho uma carga saindo de Guarulhos SP para Curitiba PR pagando R$ 4.500, se fizer sentido pra você me fala que eu confirmo",
        offsetMs: 0,
        scenario: "Oferta ativa com faixa de negociação carregada da rota",
        context:
          "Rota Guarulhos SP x Curitiba PR\nFaixa da rota: mínimo 4500 | máximo 4900\nOferta ativa para o motorista",
        currentUserMessage: "Disparo proativo de oferta GMX para rota elegível",
        reason:
          "A conversa começa com uma oferta de frete já disponível para esse motorista, respeitando o valor ofertado da rota configurada",
        ifClause:
          "existir oferta ativa para o motorista e a rota possuir faixa de negociação configurada",
        whyTriggered:
          "O simulador reproduz o momento em que a GMX inicia o contato com uma proposta comercial dentro da política da rota",
        references: [
          "Histórico de ofertas",
          "Tabela de rotas com piso e teto",
          "Tom humano da GMX",
        ],
      }),
      driverMessage("d4", "Se fechar em 4.800 eu pego", 2200, DRIVER_2),
      assistantMessage({
        id: "a5",
        text: "Consigo seguir em R$ 4.800 nessa rota e, se estiver de acordo, eu já confirmo por aqui",
        offsetMs: 3800,
        scenario: "Negociação determinística dentro da faixa permitida",
        context:
          "Pedido do motorista: 4800\nFaixa permitida: 4500 a 4900\nRodada atual: 1\nSem necessidade de escalonamento",
        currentUserMessage: "Se fechar em 4.800 eu pego",
        reason:
          "O valor pedido está dentro da faixa configurada para a rota, então a IA pode devolver uma confirmação comercial sem escalar a operação",
        ifClause:
          "o valor proposto pelo motorista estiver entre o mínimo e o máximo da rota",
        whyTriggered:
          "A contraproposta foi considerada segura pela política de negociação, então a IA respondeu com aceite condicional e aguardou a confirmação final",
        references: [
          "Faixa de negociação da rota",
          "Motor de negociação determinístico",
          "Contexto da oferta ativa",
        ],
      }),
      driverMessage("d5", "Fechado", 6200, DRIVER_2),
      assistantMessage({
        id: "a6",
        text: "Perfeito, fechei sua carga em R$ 4.800 e já registrei sua resposta, boa viagem",
        offsetMs: 8000,
        scenario: "Conclusão da negociação com gravação de aceite",
        context:
          "Valor aceito: 4800\nFaixa da rota validada\nAceite final do motorista confirmado\nOferta ativa ainda aberta no ERP",
        currentUserMessage: "Fechado",
        reason:
          "Depois da confirmação final do motorista, a rotina de negociação precisa persistir o aceite com o valor fechado e encerrar a conversa comercial",
        ifClause:
          "houver aceite explícito do motorista após um valor previamente validado pela faixa da rota",
        whyTriggered:
          "O texto do motorista confirmou o fechamento, então a IA concluiu a negociação e anexou a ferramenta de resposta da oferta",
        references: [
          "Fluxo C9 de negociação",
          "Reconhecimento de aceite direto",
          "Ferramenta resposta_oferta_carga",
        ],
        tools: [
          {
            tool: "resposta_oferta_carga",
            context: "Aceite do frete Guarulhos SP x Curitiba PR por R$ 4.800",
            result:
              'JSON anexado com {"aceite":true,"valor_aceito":4800,"valor_ofertado":4500,"origem":"Guarulhos SP","destino":"Curitiba PR"}',
          },
        ],
        erpWrites: [
          {
            entity: "historico_ofertas",
            action: "insert",
            payload: 'telefone=5511977772202 | aceite=true | valor_aceito=4800 | origem="Guarulhos SP" | destino="Curitiba PR"',
            result: "Oferta fechada e historico comercial atualizado",
          },
        ],
      }),
    ],
  },
  {
    id: "cadastro-ocr",
    title: "Onboarding com OCR",
    routine: "Cenário 8",
    driverName: DRIVER_3,
    driverPhone: "5511966663303",
    startedAt: "2026-06-16T09:28:00-03:00",
    summary: "A IA conduz o cadastro sequencial e salva documentos com OCR em cada etapa",
    expectedOutcome: "Cadastro enviado para análise com status aguardando validação",
    source: "fluxo-cadastro.ts + config-ocr.ts",
    messages: [
      driverMessage("d6", "Quero me cadastrar", 0, DRIVER_3),
      assistantMessage({
        id: "a7",
        text: "Beleza parceiro, vamos fazer seu cadastro, manda a foto da sua CNH por favor",
        offsetMs: 1100,
        scenario: "Fluxo programático de onboarding documental",
        context:
          "Motorista ainda sem documentação completa\nStatus inicial de cadastro indefinido\nSequência esperada: CNH > CRLV > ANTT > endereço > caminhão",
        currentUserMessage: "Quero me cadastrar",
        reason:
          "A frase do motorista acionou o fluxo C8 e o roteiro de onboarding sempre começa pela coleta da CNH",
        ifClause:
          "a mensagem indicar intenção de cadastro e não houver fluxo documental ativo já concluído",
        whyTriggered:
          "O cadastro entra por um caminho determinístico, sem depender de LLM para decidir a primeira etapa",
        references: [
          "Fluxo C8 de cadastro",
          "Ordem obrigatória dos documentos",
          "Ferramenta atualizar_motorista",
        ],
        tools: [
          {
            tool: "atualizar_motorista",
            context: "Abertura formal do cadastro do motorista",
            result: 'JSON anexado com {"status_cadastro":"FALTA DOCS"}',
          },
        ],
        erpWrites: [
          {
            entity: "motoristas",
            action: "update",
            payload: 'telefone=5511966663303 | status_cadastro="FALTA DOCS"',
            result: "Motorista marcado como cadastro em andamento",
          },
        ],
      }),
      driverMessage("d7", "[imagem CNH enviada]", 3000, DRIVER_3),
      assistantMessage({
        id: "a8",
        text: "CNH recebida parceiro, agora manda a foto do CRLV do cavalo",
        offsetMs: 4600,
        scenario: "OCR válido da primeira etapa do cadastro",
        context:
          "Mídia disponível no lote atual\nOCR válido para CNH\nPróxima etapa obrigatória: CRLV",
        currentUserMessage: "[imagem CNH enviada]",
        reason:
          "Como o OCR da CNH foi considerado válido, a IA pode confirmar a etapa e avançar automaticamente para o documento seguinte",
        ifClause:
          "o fluxo estiver no passo CNH e a mídia anexada produzir texto OCR válido",
        whyTriggered:
          "A presença de mídia com OCR legível eliminou a necessidade de reprompt e liberou a gravação do documento no cadastro",
        references: [
          "Prompt OCR configurável",
          "Validador de OCR",
          "Ferramenta grava_ocr",
        ],
        tools: [
          {
            tool: "grava_ocr",
            context: "Salvar CNH extraída do anexo atual",
            result: 'JSON anexado com {"tipo":"cnh","midia_id":"mid-cnh-001"}',
          },
        ],
        erpWrites: [
          {
            entity: "documentos_motorista",
            action: "insert",
            payload: 'telefone=5511966663303 | tipo="cnh" | midia_id="mid-cnh-001"',
            result: "CNH vinculada ao cadastro do motorista",
          },
        ],
      }),
      driverMessage("d8", "[imagem CRLV enviada]", 6400, DRIVER_3),
      assistantMessage({
        id: "a9",
        text: "Show parceiro, agora manda a foto ou PDF da ANTT",
        offsetMs: 8000,
        scenario: "OCR válido do CRLV e avanço da trilha documental",
        context:
          "Passo atual: CRLV\nOCR válido do anexo\nPróximo passo: ANTT",
        currentUserMessage: "[imagem CRLV enviada]",
        reason:
          "O CRLV foi lido com sucesso e o fluxo precisa seguir para a ANTT, mantendo a ordem fixa do onboarding",
        ifClause:
          "o passo atual for CRLV e o OCR retornar conteúdo legível",
        whyTriggered:
          "A IA encerrou a etapa atual e preservou o encadeamento documental para evitar cadastro incompleto",
        references: [
          "Sequência documental do fluxo C8",
          "Ferramenta grava_ocr",
          "Estado do fluxo em Redis",
        ],
        tools: [
          {
            tool: "grava_ocr",
            context: "Salvar CRLV do cavalo",
            result: 'JSON anexado com {"tipo":"crlv","midia_id":"mid-crlv-001"}',
          },
        ],
        erpWrites: [
          {
            entity: "documentos_motorista",
            action: "insert",
            payload: 'telefone=5511966663303 | tipo="crlv" | midia_id="mid-crlv-001"',
            result: "CRLV salvo no dossiê do motorista",
          },
        ],
      }),
      driverMessage("d9", "[pdf ANTT enviado]", 9800, DRIVER_3),
      assistantMessage({
        id: "a10",
        text: "Beleza, agora manda o comprovante de endereço parceiro",
        offsetMs: 11400,
        scenario: "OCR válido da ANTT com manutenção do fluxo sequencial",
        context:
          "Passo atual: ANTT\nOCR válido do PDF\nPróximo passo: comprovante de endereço",
        currentUserMessage: "[pdf ANTT enviado]",
        reason:
          "Com a ANTT salva, a próxima dependência operacional para o cadastro é o comprovante de endereço do motorista",
        ifClause:
          "o passo ANTT for concluído com OCR válido",
        whyTriggered:
          "A transição é automática porque o fluxo de cadastro não precisa de interpretação aberta nessa etapa",
        references: [
          "Fluxo C8",
          "Ferramenta grava_ocr",
        ],
        tools: [
          {
            tool: "grava_ocr",
            context: "Salvar ANTT do motorista",
            result: 'JSON anexado com {"tipo":"antt","midia_id":"mid-antt-001"}',
          },
        ],
        erpWrites: [
          {
            entity: "documentos_motorista",
            action: "insert",
            payload: 'telefone=5511966663303 | tipo="antt" | midia_id="mid-antt-001"',
            result: "ANTT registrada no perfil do motorista",
          },
        ],
      }),
      driverMessage("d10", "[pdf endereço enviado]", 13200, DRIVER_3),
      assistantMessage({
        id: "a11",
        text: "Recebido parceiro, agora manda uma foto do caminhão do cavalo",
        offsetMs: 14800,
        scenario: "Endereço confirmado e solicitação da foto do caminhão",
        context:
          "Passo atual: comprovante de endereço\nOCR válido\nÚltimo passo pendente: foto do caminhão",
        currentUserMessage: "[pdf endereço enviado]",
        reason:
          "O comprovante foi aceito e a última evidência pendente para fechamento do onboarding é a foto do caminhão",
        ifClause:
          "o comprovante de endereço tiver sido salvo com sucesso",
        whyTriggered:
          "A IA avançou para a etapa final sem abrir menu adicional, seguindo o fluxo programado",
        references: [
          "Confirmação sequencial do onboarding",
          "Ferramenta grava_ocr",
        ],
        tools: [
          {
            tool: "grava_ocr",
            context: "Salvar comprovante de endereço",
            result: 'JSON anexado com {"tipo":"endereco","midia_id":"mid-endereco-001"}',
          },
        ],
        erpWrites: [
          {
            entity: "documentos_motorista",
            action: "insert",
            payload: 'telefone=5511966663303 | tipo="endereco" | midia_id="mid-endereco-001"',
            result: "Comprovante de endereço salvo no cadastro",
          },
        ],
      }),
      driverMessage("d11", "[foto do caminhão enviada]", 16400, DRIVER_3),
      assistantMessage({
        id: "a12",
        text: "Show parceiro, cadastro enviado pra análise da equipe e deixei seus documentos vinculados no ERP, em breve te retornamos",
        offsetMs: 18200,
        scenario: "Fechamento do onboarding com escrita final no ERP",
        context:
          "Etapas anteriores concluídas\nFoto do caminhão presente\nStatus do cadastro pode migrar para aguardando validação",
        currentUserMessage: "[foto do caminhão enviada]",
        reason:
          "A última mídia obrigatória foi recebida, então o fluxo conclui o onboarding, salva a foto e atualiza o status do cadastro para análise",
        ifClause:
          "o passo atual for caminhão e a mídia do lote estiver disponível",
        whyTriggered:
          "Com a etapa final satisfeita, a IA encerrou o fluxo e disparou as duas gravações previstas para essa conclusão",
        references: [
          "Fluxo C8 concluído",
          "Ferramenta grava_ocr",
          "Ferramenta atualizar_motorista",
        ],
        tools: [
          {
            tool: "grava_ocr",
            context: "Salvar foto do caminhão do motorista",
            result: 'JSON anexado com {"tipo":"foto","midia_id":"mid-foto-001"}',
          },
          {
            tool: "atualizar_motorista",
            context: "Mudar status do cadastro para aguardando validação",
            result: 'JSON anexado com {"status_cadastro":"AGUARDANDO VALIDACAO"}',
          },
        ],
        erpWrites: [
          {
            entity: "documentos_motorista",
            action: "insert",
            payload: 'telefone=5511966663303 | tipo="foto" | midia_id="mid-foto-001"',
            result: "Foto do caminhão vinculada ao cadastro",
          },
          {
            entity: "motoristas",
            action: "update",
            payload: 'telefone=5511966663303 | status_cadastro="AGUARDANDO VALIDACAO"',
            result: "Cadastro enviado para análise humana",
          },
        ],
      }),
    ],
  },
  {
    id: "canhoto",
    title: "Canhoto de entrega",
    routine: "Fluxo de comprovante",
    driverName: DRIVER_4,
    driverPhone: "5511955554404",
    startedAt: "2026-06-16T09:40:00-03:00",
    summary: "A IA solicita a imagem do canhoto e vincula o comprovante ao embarque ativo",
    expectedOutcome: "Canhoto vinculado ao embarque #481",
    source: "fluxo-canhoto.ts + ferramentas.ts",
    messages: [
      driverMessage("d12", "Tô com o canhoto aqui", 0, DRIVER_4),
      assistantMessage({
        id: "a13",
        text: "Beleza parceiro, manda a foto do canhoto da entrega do embarque #481",
        offsetMs: 1200,
        scenario: "Fluxo direto de canhoto com embarque ativo identificado",
        context:
          "Embarque ativo principal localizado: #481\nMotorista em viagem ativa\nAinda sem anexo no lote atual",
        currentUserMessage: "Tô com o canhoto aqui",
        reason:
          "Como existe embarque ativo, a IA já sabe qual comprovante esperar e pode pedir a foto sem passar por outra triagem",
        ifClause:
          "a intenção indicar canhoto e existir embarque ativo principal associado ao motorista",
        whyTriggered:
          "O histórico operacional já mostrou qual viagem está em aberto, então o fluxo pediu a evidência certa de forma objetiva",
        references: [
          "Embarque ativo principal",
          "Fluxo de canhoto",
        ],
      }),
      driverMessage("d13", "[imagem canhoto enviada]", 3600, DRIVER_4),
      assistantMessage({
        id: "a14",
        text: "Canhoto recebido parceiro, já vinculei ao embarque #481 e o comprovante ficou salvo no ERP",
        offsetMs: 5400,
        scenario: "Persistência de comprovante no embarque ativo",
        context:
          "Mídia disponível no lote\nEmbarque #481 ainda ativo\nDocumento deve ser anexado ao embarque e ao dossiê do motorista",
        currentUserMessage: "[imagem canhoto enviada]",
        reason:
          "Com o anexo presente e o embarque ativo identificado, o fluxo consegue gravar o comprovante sem pedir confirmação adicional",
        ifClause:
          "houver midia de canhoto e o sistema encontrar embarque ativo no nome do motorista",
        whyTriggered:
          "A combinação de anexo válido com embarque conhecido permite vincular o comprovante diretamente ao pedido logístico correto",
        references: [
          "Fluxo de canhoto",
          "Ferramenta grava_comprovante",
          "Contexto do embarque ativo",
        ],
        tools: [
          {
            tool: "grava_comprovante",
            context: "Salvar canhoto no embarque #481",
            result: 'JSON anexado com {"midia_id":"mid-canhoto-481","embarque_id":481}',
          },
        ],
        erpWrites: [
          {
            entity: "embarques_documentos",
            action: "insert",
            payload: 'embarque_id=481 | tipo="comprovante_entrega" | midia_id="mid-canhoto-481"',
            result: "Canhoto vinculado à viagem e pronto para conferência",
          },
        ],
      }),
    ],
  },
  {
    id: "atualizacao-documento",
    title: "Atualização documental com confirmação",
    routine: "Fluxo de OCR incerto",
    driverName: DRIVER_5,
    driverPhone: "5511944445505",
    startedAt: "2026-06-16T09:48:00-03:00",
    summary: "A IA pede a foto, identifica OCR incerto, solicita confirmação e salva o documento certo",
    expectedOutcome: "CRLV atualizado após confirmação do motorista",
    source: "fluxo-atualizar-documento.ts + classificar-documento-ocr.ts",
    messages: [
      driverMessage("d14", "Preciso atualizar meu documento", 0, DRIVER_5),
      assistantMessage({
        id: "a15",
        text: "Beleza parceiro, manda a foto do documento que você quer atualizar",
        offsetMs: 1000,
        scenario: "Abertura do fluxo avulso de atualização documental",
        context:
          "Motorista já cadastrado no ERP\nSem tipo de documento definido ainda\nAguardando mídia para OCR",
        currentUserMessage: "Preciso atualizar meu documento",
        reason:
          "A intenção foi entendida como atualização documental, mas ainda não existe mídia nem tipo suficiente para gravar qualquer documento",
        ifClause:
          "o motorista pedir atualização de documento e não informar ainda qual arquivo será enviado",
        whyTriggered:
          "O fluxo evita adivinhar o tipo do documento e pede o anexo primeiro para não cometer gravação errada no ERP",
        references: [
          "Fluxo de atualização avulsa",
          "Regra de não usar grava_ocr sem mídia",
        ],
      }),
      driverMessage("d15", "[imagem documento enviada]", 3100, DRIVER_5),
      assistantMessage({
        id: "a16",
        text: "Li um pedaço assim, RNTRC 55443322 e placa FGH4J56, mas não fechei qual documento é, me confirma se é o CRLV que eu salvo certo",
        offsetMs: 5200,
        scenario: "OCR com confiança baixa e necessidade de confirmação humana",
        context:
          "OCR trouxe indícios de veículo\nConfiança da classificação abaixo de 0.55\nDocumento pode ser CRLV, mas ainda está ambíguo",
        currentUserMessage: "[imagem documento enviada]",
        reason:
          "O OCR encontrou dados úteis, porém a confiança ficou baixa demais para salvar sem validação explícita do motorista",
        ifClause:
          "existir OCR parcialmente útil mas a classificação do documento estiver ambígua ou com baixa confiança",
        whyTriggered:
          "A rotina segura prioriza perguntar antes de gravar quando a inferência do tipo documental não é robusta o suficiente",
        references: [
          "Classificador de documento por OCR",
          "Regra de desambiguação",
          "Confirmação humana antes da ferramenta",
        ],
      }),
      driverMessage("d16", "Sim, é o CRLV", 7600, DRIVER_5),
      assistantMessage({
        id: "a17",
        text: "Perfeito, confirmei que é o CRLV e já deixei o documento atualizado no sistema",
        offsetMs: 9300,
        scenario: "Confirmação positiva após OCR incerto com gravação segura",
        context:
          "Tipo confirmado pelo motorista: CRLV\nMídia pendente armazenada no estado do fluxo\nOCR suficiente para anexar texto extraído",
        currentUserMessage: "Sim, é o CRLV",
        reason:
          "Depois da confirmação humana, a ambiguidade foi resolvida e a ferramenta de gravação pôde ser executada com segurança",
        ifClause:
          "a conversa estiver aguardando confirmação de OCR e o motorista confirmar o tipo inferido",
        whyTriggered:
          "A confirmação removeu o risco de gravar o documento errado, então a IA consolidou a atualização no ERP",
        references: [
          "Estado de confirmação pendente",
          "Ferramenta grava_ocr",
          "Texto OCR reusado do anexo pendente",
        ],
        tools: [
          {
            tool: "grava_ocr",
            context: "Atualizar CRLV após confirmação do motorista",
            result:
              'JSON anexado com {"tipo":"crlv","midia_id":"mid-crlv-888","texto_extraido":"RNTRC 55443322 | placa FGH4J56"}',
          },
        ],
        erpWrites: [
          {
            entity: "documentos_motorista",
            action: "update",
            payload:
              'telefone=5511944445505 | tipo="crlv" | midia_id="mid-crlv-888" | texto_extraido="RNTRC 55443322 | placa FGH4J56"',
            result: "Documento CRLV substituído com a nova versão",
          },
        ],
      }),
    ],
  },
];
