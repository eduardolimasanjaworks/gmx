# 📊 AUDITORIA DE COLLECTIONS DO DIRECTUS

## ✅ COLLECTIONS EXISTENTES E CAMPOS VERIFICADOS

Baseado na análise do código `DriverProfileDialog.tsx`, aqui estão as collections e campos que **JÁ EXISTEM** no seu Directus:

---

### **1. Collection: `cnh`** ✅

**Campos confirmados:**
- ✅ `id` (UUID)
- ✅ `motorista_id` (UUID - Relação)
- ✅ `cpf` (String)
- ✅ `data_nasc` (Date)
- ✅ `nome_mae` (String)
- ✅ `n_registro_cnh` (String)
- ✅ `n_formulario_cnh` (String)
- ✅ **`validade`** (Date) ← **USADO PARA ALERTAS**
- ✅ `emissao_cnh` (Date)
- ✅ `n_cnh_seguranca` (String)
- ✅ `n_cnh_renach` (String)
- ✅ `primeira_habilitacao` (Date)
- ✅ `categoria` (String)
- ✅ `cidade_emissao` (String)
- ✅ `observacao` (Text)
- ✅ `link` (String - URL do anexo)

**Status:** ✅ **PRONTO PARA ALERTAS**

---

### **2. Collection: `antt`** ✅

**Campos confirmados:**
- ✅ `id` (UUID)
- ✅ `motorista_id` (UUID - Relação)
- ✅ `numero_antt` (String)
- ✅ `cnpj_cpf` (String)
- ✅ `nome` (String)
- ✅ `observacao` (Text)
- ✅ `link` (String - URL do anexo)

**Campos FALTANDO para alertas:**
- ❌ **`validade`** (Date) ← **PRECISA ADICIONAR**

**Status:** ⚠️ **PRECISA ADICIONAR CAMPO `validade`**

---

### **3. Collection: `disponivel`** ✅

**Campos confirmados:**
- ✅ `id` (UUID)
- ✅ `motorista_id` (UUID - Relação)
- ✅ `status` (String) - 'disponivel', 'indisponivel', 'retornando'
- ✅ **`date_created`** (Timestamp) ← **USADO PARA ALERTAS**
- ✅ `localizacao_atual` (String)
- ✅ `local_disponibilidade` (String)
- ✅ `latitude` (Decimal)
- ✅ `longitude` (Decimal)
- ✅ `user_created` (UUID - Relação)

**Campos ADICIONADOS (pela migração 002):**
- ✅ `disponivel_em` (Timestamp)
- ✅ `eta_destino` (Timestamp)
- ✅ `distancia_destino_km` (Integer)
- ✅ `motivo_bloqueio` (Text)

**Status:** ✅ **PRONTO PARA ALERTAS**

---

### **4. Collection: `vehicle_matches`** ✅

**Campos confirmados:**
- ✅ `id` (UUID)
- ✅ `embarque_id` (UUID - Relação)
- ✅ `motorista_id` (UUID - Relação)
- ✅ **`status`** (String) ← **USADO PARA ALERTAS**
- ✅ **`created_at`** (Timestamp) ← **USADO PARA ALERTAS**

**Campos ADICIONADOS (pela migração 004):**
- ✅ `oferecido_automaticamente` (Boolean)
- ✅ `score_compatibilidade` (Decimal)
- ✅ `justificativa_match` (JSONB)

**Status:** ✅ **PRONTO PARA ALERTAS**

---

### **5. Collection: `embarques`** ✅

**Campos confirmados:**
- ✅ `id` (UUID)
- ✅ `motorista_id` (UUID - Relação)
- ✅ **`status`** (String) ← **USADO PARA ALERTAS**
- ✅ **`actual_arrival_time`** (Timestamp) ← **USADO PARA ALERTAS**
- ✅ `origin` (String)
- ✅ `destination` (String)
- ✅ `produto_predominante` (String)
- ✅ `tipo_carga` (String)
- ✅ `peso_total` (Integer)
- ✅ `total_value` (Decimal)
- ✅ `pickup_date` (Date)
- ✅ `created_at` (Timestamp)

**Campos FALTANDO para alertas:**
- ❌ **`canhoto_anexado`** (Boolean) ← **PRECISA ADICIONAR**

**Status:** ⚠️ **PRECISA ADICIONAR CAMPO `canhoto_anexado`**

---

### **6. Collection: `cadastro_motorista`** ✅

**Campos confirmados:**
- ✅ `id` (UUID)
- ✅ `nome` (String)
- ✅ `sobrenome` (String)
- ✅ `telefone` (String)
- ✅ `cidade` (String)
- ✅ `estado` (String)
- ✅ `status` (String) - 'active', 'inactive'

**Status:** ✅ **OK**

---

### **7. Outras Collections** ✅

- ✅ `crlv` (Documento do veículo)
- ✅ `comprovante_endereco`
- ✅ `fotos`
- ✅ `carreta_1`, `carreta_2`, `carreta_3`

---

## 🔧 CAMPOS QUE PRECISAM SER ADICIONADOS

### **1. Tabela `antt` - Adicionar campo `validade`**

```sql
ALTER TABLE antt 
ADD COLUMN validade DATE;

COMMENT ON COLUMN antt.validade IS 'Data de validade do registro ANTT';
```

### **2. Tabela `embarques` - Adicionar campo `canhoto_anexado`**

```sql
ALTER TABLE embarques 
ADD COLUMN canhoto_anexado BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN embarques.canhoto_anexado IS 'Indica se o canhoto de entrega foi anexado';
```

---

## 📋 RESUMO: ALERTAS QUE FUNCIONAM AGORA

| Alerta | Collection | Campo Chave | Status |
|--------|-----------|-------------|--------|
| **CNH Vencida** | `cnh` | `validade` | ✅ **FUNCIONA** |
| **ANTT Vencida** | `antt` | `validade` | ⚠️ **PRECISA ADICIONAR CAMPO** |
| **Carga Sem Aceite** | `vehicle_matches` | `status`, `created_at` | ✅ **FUNCIONA** |
| **Motorista Inativo** | `disponivel` | `date_created` | ✅ **FUNCIONA** |
| **CT-e Sem Canhoto** | `embarques` | `canhoto_anexado` | ⚠️ **PRECISA ADICIONAR CAMPO** |

---

## ✅ PRÓXIMOS PASSOS

1. **Adicionar campo `validade` na tabela `antt`**
2. **Adicionar campo `canhoto_anexado` na tabela `embarques`**
3. **Executar script de auditoria para testar**

---

**Quer que eu crie as migrações SQL para adicionar esses 2 campos faltantes?**
