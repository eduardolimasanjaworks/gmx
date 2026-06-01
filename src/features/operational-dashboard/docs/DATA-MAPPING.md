# Mapeamento de dados — Dashboard operacional

Documentação para implementação e RAG. Fonte: Directus via `publicDirectus` (`/api` proxy).

## Coleções

| Métrica / visual | Coleção | Campos principais |
|-----------------|---------|-------------------|
| Pizza de status | `follow` | `status`, `produto`, `data_pedido`, `date_created` |
| Cargas abertas / fechadas | `follow` | `status` — aberta: não FINALIZADA/CANCELADA; fechada: FINALIZADA |
| Veículos disponíveis | `disponivel` | `status`, `motorista_id`, `date_created`, `local_disponibilidade` |
| Veículos em trânsito | `embarques` | `status` in `in_transit`, `loading`, `unloading` |
| TOP rotas / matriz | `embarques` | `origin`, `destination`, `driver_id`, `produto`, `date_created` |
| Filtro operações | `follow.produto` + `embarques.produto` | Normalizar para ARROZ, LATA, ME, MALTE |

## Status da pizza (normalização)

Labels do Miro → match case-insensitive em `follow.status`:

- FINALIZADA
- NOSHOW / NO SHOW
- CANCELADA
- FURO AMBEV
- DECLINADA

Valores fora do conjunto: agrupar em "Outros" ou ignorar (configurável em `status-normalize.ts`).

## Período global

| UI | Implementação |
|----|----------------|
| HOJE | `date_created` >= início do dia local |
| SEMANA | Segunda a domingo da semana calendário atual (ISO week, locale pt-BR) |
| MÊS | Primeiro dia do mês corrente até agora |

Filtros locais (ano/trimestre/mês/dia) intersectam com o período global.

## Disponibilidade diária

- Agrupar por dia do mês usando `disponivel.date_created`.
- Detalhe ao clicar: registros do dia com `motorista_id.nome`, `local_disponibilidade`, tipo veículo se existir em relação motorista.

## Embarques — motorista

Campo: `driver_id` (relação). Fallback: contagem sem nome se relação indisponível.

## Operações (produto)

Mapear `produto` contendo (case-insensitive): arroz, lata, me, malte. Campo `TODOS` no UI = sem filtro de produto.
