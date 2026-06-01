# Padrões de desenvolvimento GMX (interno — RAG / IDE)

Documento para indexação na IDE e agentes. **Não é exibido ao usuário final.**

## Vibecode first

1. Prototipar fluxo e nomes claros antes de abstrações pesadas.
2. Um módulo = uma responsabilidade; pastas com `README.md` curto (propósito, entradas, saídas).
3. Commits com título longo + corpo explicativo (por quê, impacto, rollback).

## Comentários no código

| Onde | Regra |
|------|--------|
| `src/**/*.ts(x)` | Comentários de bloco `/** … */` no topo do arquivo: `@module`, `@purpose`, `@deps` — úteis para RAG. |
| Runtime | **Nunca** `console.log` de debug, comentários em strings de UI, nem tooltips com texto de dev. |
| Build | Produção: sem comentários óbvios em JSX visível; lógica documentada em `.md` na pasta. |

## Comentários que o usuário NÃO pode ver

- Nada de `console.*` com contexto interno em produção (usar `Logger` só se nível controlado e sem dados sensíveis).
- Não expor `@todo`, nomes de branches ou IDs internos em mensagens de toast/erro.
- Erros para o operador: linguagem de negócio; detalhes técnicos só em logs servidor (quando existir).

## Testes — cultura Always

- Toda feature nova: teste unitário (Vitest) ou de integração mínimo.
- Bugfix: teste que reproduz o bug antes do fix.
- Scripts: `npm test`, `npm run test:watch`, CI quando configurado.

## Estrutura alvo (evolução)

```
src/
  features/<nome>/
    README.md      # índice RAG da feature
    components/
    hooks/
    __tests__/
docs/
  CHECKPOINT.md
  DEV-STANDARDS.md
```

## Marco Git

Ver `docs/CHECKPOINT.md` — tag `marco/pre-vibecode-2026-05-27`.
