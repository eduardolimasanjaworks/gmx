# Marco de restauração — GMX

**Tag Git:** `marco/pre-vibecode-2026-05-27`  
**Branch de segurança:** `checkpoint/pre-vibecode-2026-05-27`  
**Commit base:** `a0cba71` (main após aba Conversas + auth resiliente)  
**Data:** 2026-05-27

## Quando usar

Antes de iniciar o ciclo **Vibecode** (muitas alterações, modularização, testes).  
Se algo sair do controle, volte a este ponto exato.

## Restaurar código local

```bash
cd /root/gmx
git fetch origin --tags
git checkout main
git reset --hard marco/pre-vibecode-2026-05-27
```

Ou pela branch de checkpoint:

```bash
git checkout checkpoint/pre-vibecode-2026-05-27
git checkout -B main
```

## Restaurar apenas um arquivo/pasta

```bash
git checkout marco/pre-vibecode-2026-05-27 -- src/pages/Dashboard.tsx
```

## Publicar rollback no GitHub (cuidado)

Só se a equipe concordar em reverter o remoto:

```bash
git push origin main --force-with-lease
# após reset local para a tag
```

## O que este marco inclui

- Aba **Conversas** (`ConversasPanel`, iframe TechFala)
- **AuthContext** com parsing seguro de JSON no login/refresh
- Estado anterior a modularização Vibecode, Vitest e `ARCHITECTURE.md` por pasta

## Próximo marco

Criar nova tag `marco/<nome-curto>-YYYY-MM-DD` ao fechar cada fase grande.
