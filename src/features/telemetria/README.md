# Telemetria

Feature de monitoramento de presença dos usuários no GMX, com persistência em **Directus**.

## Objetivo
- Monitorar quem está com a aba aberta em `https://gmx.sanjaworks.com/`
- Exibir estado de presença: em foco, sem foco, aba oculta, offline
- Permitir filtro global por **Intervalo** no header do Dashboard

## Arquitetura
- Coleta no browser: `hooks/useTelemetriaPresence.ts`
- Persistência Directus: `services/telemetry-store.ts`
- Consulta e tela: `hooks/useTelemetriaQuery.ts` + `components/TelemetriaPanel.tsx`

## Eventos monitorados
- `init`, `heartbeat`, `focus`, `blur`, `visibility_change`, `online`, `offline`, `shutdown`, `activity`

## Permissão
Aba disponível para usuários com permissão **gestao_equipe** (label: Gestão de equipe).

## Dependências de ambiente
Nenhuma dependência de Supabase (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` não são usadas nesta feature).
