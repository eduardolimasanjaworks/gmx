# 📊 Revisão Completa de Collections - Coerência e Estrutura

## 🔍 Análise das Collections Principais

### 1. **`cadastro_motorista`** (Motorista Principal)

**Estrutura:**
- `id` (UUID/Integer)
- `nome`, `sobrenome` (String)
- `telefone` (String)
- `cidade`, `estado` (String)
- `status` (String) - 'active', 'inactive'

**Relacionamentos:**
- `dados_cnh` → `cnh` (1:N)
- `dados_antt` → `antt` (1:N)
- `dados_crlv` → `crlv` (1:N)
- `dados_endereco` → `comprovante_endereco` (1:N)
- `dados_fotos` → `fotos` (1:N)
- `carreta1` → `carreta_1` (1:N)
- `carreta2` → `carreta_2` (1:N)
- `carreta3` → `carreta_3` (1:N)
- `dados_disponibilidade` → `disponivel` (1:N)

**Status:** ✅ Estrutura coerente

---

### 2. **`disponivel`** (Disponibilidade do Motorista)

**Estrutura Atual:**
- `id` (UUID)
- `motorista_id` (UUID/Integer) - FK para `cadastro_motorista`
- `status` (String) - 'disponivel', 'indisponivel', 'retornando' ⚠️
- `localizacao_atual` (String)
- `local_disponibilidade` (String)
- `latitude`, `longitude` (Decimal)
- `disponivel_em` (Timestamp)
- `eta_destino` (Timestamp)
- `distancia_destino_km` (Integer)
- `motivo_bloqueio` (Text)
- `observacao` (Text)
- `date_created`, `date_updated` (Timestamp)

**Problema Identificado:**
- ⚠️ Campo `status` é String, mas deveria ser **Boolean** conforme solicitação
- Campo `status` atual permite múltiplos valores ('disponivel', 'indisponivel', 'retornando')
- Se mudarmos para boolean, precisamos decidir o que fazer com estados intermediários

**Proposta de Mudança:**
- ✅ Adicionar campo `disponivel` (Boolean)
- ⚠️ Manter `status` (String) para estados adicionais OU remover se não for mais necessário
- Campo `disponivel` (Boolean): `true` = disponível, `false` = indisponível

**Status:** ⚠️ **PRECISA ALTERAÇÃO** - Campo `status` → `disponivel` (Boolean)

---

### 3. **`cnh`** (CNH do Motorista)

**Estrutura:**
- `id` (UUID)
- `motorista_id` (UUID/Integer) - FK para `cadastro_motorista`
- `cpf` (String)
- `n_registro_cnh` (String)
- `validade` (Date) ✅
- `categoria` (String)
- `link` (String - URL)

**Status:** ✅ Estrutura coerente

---

### 4. **`antt`** (ANTT do Motorista)

**Estrutura:**
- `id` (UUID)
- `motorista_id` (UUID/Integer) - FK para `cadastro_motorista`
- `numero_antt` (String)
- `cnpj_cpf` (String)
- `nome` (String)
- `validade` (Date) ⚠️ - Campo FALTANDO conforme AUDITORIA_COLLECTIONS.md

**Status:** ⚠️ **PRECISA ADICIONAR** campo `validade`

---

### 5. **`carreta_1`, `carreta_2`, `carreta_3`** (Equipamentos)

**Estrutura:**
- `id` (UUID/Integer)
- `motorista_id` (UUID/Integer) - FK para `cadastro_motorista`
- `modelo` (String) - Ex: "GRANELEIRA", "CONTAINER"
- `cap` (String) - Ex: "30 TON" ⚠️ Deveria ser Number?
- `placa` (String)
- `renavam` (String)

**Problemas Identificados:**
- ⚠️ Campo `cap` é String ("30 TON"), dificulta cálculos
- ⚠️ Não está sendo usado no matching (código usa valores hardcoded)

**Status:** ⚠️ **PRECISA USO REAL** no matching

---

### 6. **`embarques`** (Cargas/Entregas)

**Estrutura:**
- `id` (UUID)
- `motorista_id` (UUID/Integer) - FK para `cadastro_motorista`
- `status` (String) - 'new', 'pending', 'delivered', etc.
- `origin`, `destination` (String)
- `produto_predominante` (String)
- `tipo_carga` (String)
- `peso_total` (Integer)
- `total_value` (Decimal)
- `pickup_date`, `delivery_date` (Timestamp)
- `canhoto_anexado` (Boolean) ⚠️ - Campo FALTANDO conforme AUDITORIA_COLLECTIONS.md

**Status:** ⚠️ **PRECISA ADICIONAR** campo `canhoto_anexado`

---

### 7. **`vehicle_matches`** (Ofertas/Matching)

**Estrutura:**
- `id` (UUID)
- `embarque_id` (UUID/Integer) - FK para `embarques`
- `motorista_id` (UUID/Integer) - FK para `cadastro_motorista`
- `status` (String) - 'suggested', 'offered', 'accepted', 'rejected'
- `score_compatibilidade` (Decimal)
- `oferecido_automaticamente` (Boolean)
- `justificativa_match` (JSONB)

**Status:** ✅ Estrutura coerente

---

### 8. **`location_history`** (Histórico GPS)

**Estrutura:**
- `id` (UUID)
- `motorista_id` (UUID/Integer) - FK para `cadastro_motorista`
- `embarque_id` (UUID/Integer) - FK para `embarques` (opcional)
- `latitude`, `longitude` (Decimal)
- `timestamp` (Timestamp)
- `velocidade` (Integer)
- `status` (String) - 'em_transito', 'parado', 'carregando', 'descarregando'

**Status:** ✅ Estrutura coerente (mas não está sendo usada no matching)

---

## 🔴 Problemas de Coerência Identificados

### 1. **Tipo de ID Inconsistente**
- Algumas tabelas usam `UUID`
- Outras usam `Integer`
- Relacionamentos podem estar quebrados se tipos não correspondem

**Verificar:**
- `cadastro_motorista.id` → Qual tipo?
- `disponivel.motorista_id` → Qual tipo?
- `carreta_1.motorista_id` → Qual tipo?

### 2. **Campo `status` vs `disponivel` (Boolean)**
- Tabela `disponivel` tem campo `status` (String)
- Usuário quer `disponivel` (Boolean)
- **Decisão necessária:** Remover `status` ou manter ambos?

### 3. **Campos Faltantes**
- `antt.validade` (Date) - FALTANDO
- `embarques.canhoto_anexado` (Boolean) - FALTANDO

### 4. **Uso vs Definição**
- Tabelas `carreta_1/2/3` existem mas não são consultadas
- Tabela `location_history` existe mas não é usada no matching

---

## ✅ Recomendações de Ações

### **Prioridade ALTA:**

1. **Adicionar campo `disponivel` (Boolean) na tabela `disponivel`**
   - Novo campo: `disponivel` (Boolean)
   - Migrar dados: `status === 'disponivel'` → `disponivel = true`
   - Atualizar código para usar `disponivel` em vez de `status === 'disponivel'`

2. **Adicionar campo `validade` na tabela `antt`**
   ```sql
   ALTER TABLE antt ADD COLUMN validade DATE;
   ```

3. **Adicionar campo `canhoto_anexado` na tabela `embarques`**
   ```sql
   ALTER TABLE embarques ADD COLUMN canhoto_anexado BOOLEAN DEFAULT FALSE;
   ```

### **Prioridade MÉDIA:**

4. **Converter campo `cap` de String para Number na tabela `carreta_*`**
   - Atualmente: `cap = "30 TON"` (String)
   - Proposto: `capacidade_kg = 30000` (Integer)
   - Ou manter String mas extrair número para cálculos

5. **Usar tabelas `carreta_*` no matching**
   - Buscar `modelo` e `cap` reais ao invés de valores hardcoded

6. **Usar tabela `location_history` no matching**
   - Buscar última localização real do motorista

### **Prioridade BAIXA:**

7. **Verificar consistência de tipos de ID (UUID vs Integer)**
   - Padronizar se possível

8. **Documentar relacionamentos**
   - Criar diagrama ER se necessário

---

## 📋 Checklist de Implementação

- [ ] 1. Adicionar campo `disponivel` (Boolean) em `disponivel`
- [ ] 2. Migrar dados existentes (`status === 'disponivel'` → `disponivel = true`)
- [ ] 3. Atualizar código para usar campo `disponivel` (Boolean)
- [ ] 4. Adicionar campo `validade` em `antt`
- [ ] 5. Adicionar campo `canhoto_anexado` em `embarques`
- [ ] 6. Atualizar documentação

---

**Data da Revisão:** 2026-01-12  
**Status:** ⚠️ Aguardando implementação das mudanças
