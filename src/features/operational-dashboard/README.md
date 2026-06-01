# Dashboard operacional

Feature modular substituindo a aba `stats` antiga. Dados apenas via Directus (`services/dashboard-queries.ts`).

## Seções

1. **Operacional** — KPIs, pizza de status, filtros globais
2. **Disponibilidade** — barras diárias + detalhe ao clicar
3. **Rotas** — TOP rotas (destino ou par) + matriz motorista×destino

## Documentação

- `docs/DATA-MAPPING.md` — mapeamento coleções/campos
- Subpastas com `README.md` para RAG

## Testes

```bash
npm run test
```
