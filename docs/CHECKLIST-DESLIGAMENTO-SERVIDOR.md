# Checklist — o que pode desligar sem afetar GMX em produção

**Servidor:** 91.99.137.101 · **Atualizado:** 2026-05-27  
**Produção GMX:** `gmx.techfala.com.br` / `gmx.sanjaworks.com` via nginx → frontend **8092** + API **8057**

> Antes de parar qualquer item: `docker ps` e teste o site. Após parar: `curl -I https://gmx.sanjaworks.com` e login no painel.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| 🟢 | Pode desligar — não está no caminho de produção do GMX |
| 🟡 | Pode desligar com confirmação — outro produto ou já quebrado/substituído |
| 🔴 | **Não desligar** — produção GMX |
| ⚪ | Só pasta no disco (sem container) — apagar libera pouco, risco baixo se backup no Git |

---

## 🔴 Núcleo GMX (produção) — manter ligado

| Item | Porta | Função |
|------|-------|--------|
| `gmx-frontend-local-v2` | 127.0.0.1:**8092** | Frontend servido pelo nginx (`gmx-techfala`) |
| `gmx_app` | **8057** | Directus / API (`/api` no nginx) |
| `gmx_db` | 5432 (interno) | PostgreSQL/PostGIS dos dados GMX |
| `gmx_cache` | 6379 (interno) | Redis do Directus |
| Pasta `/root/gmx-directus` | — | **Compose fonte** de `gmx_db`, `gmx_app`, `gmx_cache` (não é duplicata) |
| Pasta `/root/gmx` | — | Código-fonte; build gera imagens dos frontends |
| Nginx `gmx-techfala` | 4443 | Proxy HTTPS → 8092 + 8057 |

**Não confundir:** `gmx-directus` ≠ projeto morto — é o stack de banco/API em produção.

---

## 🟢 Seguro para desligar (GMX)

### 1. Segundo frontend GMX (teste / build antigo)

| Container | Porta | Motivo |
|-----------|-------|--------|
| `gmx-frontend-v3-1778693531` | 127.0.0.1:**8093** | Nginx aponta só para **8092**. v3 não recebe tráfego público. |

```bash
docker stop gmx-frontend-v3-1778693531
docker rm gmx-frontend-v3-1778693531
# Opcional: docker rmi f3d95c50ffc3
```

**Espaço:** ~66 MB de imagem + camadas compartilhadas.  
**Risco GMX:** nenhum, se 8092 continuar Up.

### 2. Stack Traefik `stacks/app_gmx` (parada)

| Item | Estado |
|------|--------|
| `app_gmx_frontend` (imagem `gmx-web:eduardolima`, porta 8091) | **Não está rodando** |
| Traefik | **Não está rodando** |

Produção atual usa **nginx** em 8092, não Traefik. Pode deixar de subir; não precisa `docker compose up` aqui.

### 3. `gmx/docker-compose.yml` (victorhfr99, porta 8080)

Compose antigo em `/root/gmx/docker-compose.yml` — **container não listado em `docker ps`**. Porta 8080 hoje é **formflow-soft**. Não executar `docker compose up` nesse arquivo (conflito de porta).

---

## 🟡 Desligar com confirmação (outros produtos / já migrado)

### 4. Directus RH Lopes (`directus-rh-analisador-lopes`)

| Item | Estado |
|------|--------|
| CMS | **Exited** (já parado) |
| DB `directus-rh-analisador-lopes-db` | Ainda **Up** |
| GitHub | https://github.com/eduardolimasanjaworks/directus-rh-analisador-lopes |
| Nginx `directuslopes.techfala.com.br` | Aponta **8061** → CMS morto = **já fora do ar** |

```bash
cd /root/directus-rh-analisador-lopes && docker compose down
rm -rf /root/directus-rh-analisador-lopes
```

**Espaço:** ~67 MB pasta + ~500 MB imagens se remover postgres:15 dedicado (cuidado: outro serviço pode usar a mesma imagem).

**Risco:** quebra `directuslopes.techfala.com.br` e qualquer integração na 8061 (já quebrada com CMS down).

### 5. `lopesrh-static-nginx` (porta 8063)

| Item | Detalhe |
|------|---------|
| Porta | **8063** público |
| Produção Lopes RH web | Nginx usa **8062** (`lopesrh-techfala`), não 8063 |

Provável sobra ou stack antiga. Confirmar com time se algo acessa `:8063` antes de parar.

```bash
docker stop lopesrh-static-nginx && docker rm lopesrh-static-nginx
```

### 6. Pastas Directus sem container

| Pasta | Tamanho ~ | Containers |
|-------|-----------|--------------|
| `/root/directus-sendmessage-api-oficial` | 65 MB | Nenhum |
| `/root/directus-dispemec` | 47 MB | Nenhum |

Subir no GitHub (como RH Lopes) e apagar se não forem mais usados. **Não afeta GMX.**

### 7. Evolution API

| Item | Estado |
|------|--------|
| `/root/evolution-api-oficial` | **Já removido** |
| Nginx `evolution-101-techfala` | Site ainda em `sites-enabled` — desabilitar se não houver backend |

```bash
rm /etc/nginx/sites-enabled/evolution-101-techfala
nginx -t && systemctl reload nginx
```

### 8. Outros serviços no mesmo servidor (não GMX)

Só desligar se o negócio não usar mais:

| Container | Porta | Produto |
|-----------|-------|---------|
| `formflow-soft` | 8080 | Formulário |
| `sales-intelligence-engine` | 3000 | Sales engine |
| `techfala-dashboard` | 3847 | Dashboard |
| `processador-logistica` | 5001 | Processador XLS |
| `triagem-api` | 3001 (interno) | Triagem Lopes RH |

`gmx.techfala.com.br` no **HTTP :80** (arquivo `gmx.techfala.com.br`) proxy para **8080** = formflow, **não** o GMX HTTPS. Produção GMX HTTPS é `gmx-techfala` → 8092.

---

## ⚪ Limpeza de disco (sem parar produção GMX)

| Ação | Ganho estimado | Risco |
|------|----------------|-------|
| Logs já limpos (journal/syslog) | feito (~7 GB) | — |
| `docker image prune` (só dangling) | baixo | baixo |
| Remover `gmx-frontend-v3` | ~tens MB | 🟢 |
| `docker compose down` directus-rh + apagar pasta | ~67 MB + DB | 🟡 |
| Parar `lopesrh-static-nginx` | ~62 MB imagem nginx | 🟡 |
| Não usar `docker system prune -a` | — | 🔴 apaga imagens em uso |

---

## Ordem sugerida (mais seguro → mais impacto)

1. 🟢 Parar `gmx-frontend-v3-1778693531` (8093)  
2. 🟡 `docker compose down` + apagar `/root/directus-rh-analisador-lopes` (já no GitHub)  
3. 🟡 Confirmar e parar `lopesrh-static-nginx` (8063)  
4. ⚪ Arquivar/apagar `directus-sendmessage` e `directus-dispemec` no GitHub  
5. 🟡 Desabilitar nginx evolution órfão  
6. Revisar com você itens da seção 8 (formflow, dashboard, etc.)

---

## Verificação pós-desligamento (GMX)

```bash
curl -sI -k https://gmx.sanjaworks.com | head -5
curl -sI http://127.0.0.1:8092 | head -3
curl -sI http://127.0.0.1:8057/server/health | head -3
docker ps --filter name=gmx
```

Login no painel + uma aba (ex. Embarques) = OK.

---

## Resumo visual

```
Internet → nginx (4443) → 8092 gmx-frontend-local-v2  ✅ PRODUÇÃO
                         → 8057 gmx_app               ✅ PRODUÇÃO
                         → 8093 gmx-frontend-v3       ❌ pode parar
                         → 8061 directus-rh CMS       ❌ já parado / migrar
```

---

*Documento interno para RAG/IDE — não expor textos de dev no frontend.*
