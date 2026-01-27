# 📊 Análise do Sistema de Matching - Pontos Críticos

## ✅ Situação Atual

### 1. **Critérios Comerciais** ⚠️

**Status:** ❌ **MUITO SIMPLIFICADO**

O código atual em `matchingAlgorithm.ts` (linha 249-266) apenas verifica se a GR está aprovada:

```typescript
function calcularScoreComercial(motorista) {
    let score = 50;
    if (motorista.gr_aprovada === true) {
        score += 50;  // Apenas isso!
    } else if (motorista.gr_aprovada === false) {
        score -= 30;
    }
    return { score, justificativa: 'Documentação OK' };
}
```

**Problema:** Não há critérios comerciais reais implementados. Deveria considerar:
- Margem de lucro por motorista
- Taxa de sucesso histórica
- Preferências comerciais (ex: motoristas preferenciais)
- Custos operacionais

**Recomendação:** ❓ **Definir critérios comerciais reais** antes de calcular score

---

### 2. **Disponibilidade como Porcentagem** ⚠️

**Status:** ⚠️ **QUESTIONÁVEL**

O código atual calcula disponibilidade como uma porcentagem baseada no tempo até ficar disponível:

```typescript
function calcularScoreDisponibilidade(motorista) {
    if (motorista.status === 'disponivel') {
        return { score: 100, ... };  // Disponível = 100%
    }
    
    if (motorista.status === 'retornando' && motorista.disponivel_em) {
        const horasAteDisponivel = ...;
        if (horasAteDisponivel <= 2) return { score: 90, ... };
        if (horasAteDisponivel <= 6) return { score: 70, ... };
        // etc...
    }
    
    return { score: 0, ... };  // Indisponível = 0%
}
```

**Problema:** 
- Disponibilidade deveria ser **binária** (sim/não) para filtragem inicial
- O tempo até disponibilidade pode ser usado para **ordenação**, não para porcentagem
- Motoristas "retornando em 2h" podem receber ofertas mesmo não estando disponíveis

**Recomendação:** ✅ **Mudar para lógica binária:**
- Se `status === 'disponivel'` → **INCLUIR** no matching
- Se `status === 'retornando'` E `disponivel_em` <= X horas → **INCLUIR** (opcional)
- Caso contrário → **EXCLUIR**

O tempo pode ser usado para **ordenar** (priorizar os que ficam disponíveis primeiro), não para calcular score.

---

### 3. **Tabela de Histórico de Localização** ✅

**Status:** ✅ **EXISTE E DEVE SER USADA**

A tabela `location_history` existe e armazena:
- `motorista_id`
- `latitude`, `longitude`
- `timestamp`
- `endereco_aproximado`
- `status` (em_transito, parado, carregando, descarregando)

**Problema Atual:**
- O sistema está usando `disponivel.latitude` e `disponivel.longitude` que podem estar desatualizados
- Não está usando o histórico de rastreamento GPS real

**Recomendação:** ✅ **Usar `location_history` para:**
1. Pegar a última localização conhecida do motorista
2. Calcular distância real até a origem da carga
3. Registrar a localização quando enviamos a oferta (para análise posterior)

---

### 4. **Registro de Localização no Momento da Oferta** ❌

**Status:** ❌ **NÃO EXISTE**

A tabela `vehicle_matches` registra quando enviamos oferta, mas **NÃO registra:**
- Onde o motorista estava quando enviamos
- Qual era a última localização GPS conhecida
- Se o motorista respondeu e onde estava quando respondeu

**Recomendação:** ✅ **Adicionar campos ou usar `location_history`:**
- Opção 1: Adicionar campos `latitude_oferta`, `longitude_oferta` em `vehicle_matches`
- Opção 2: Usar `location_history` para buscar a última localização antes de `created_at` da oferta
- Opção 3: Criar registro em `location_history` vinculado à oferta (campo `oferta_id`)

---

## 🎯 Propostas de Melhoria

### **Proposta 1: Disponibilidade Binária**

```typescript
function motoristaEstaDisponivel(motorista): boolean {
    // Lógica binária: sim ou não
    if (motorista.status === 'disponivel') {
        return true;
    }
    
    if (motorista.status === 'retornando' && motorista.disponivel_em) {
        const horasAteDisponivel = calcularHoras(motorista.disponivel_em);
        return horasAteDisponivel <= 6; // Disponível em até 6h
    }
    
    return false; // Não disponível
}
```

### **Proposta 2: Usar location_history para Localização Real**

```typescript
async function buscarUltimaLocalizacao(motoristaId: string) {
    const locations = await directus.request(
        readItems('location_history', {
            filter: { motorista_id: { _eq: motoristaId } },
            sort: ['-timestamp'],
            limit: 1
        })
    );
    
    return locations[0] || null;
}
```

### **Proposta 3: Registrar Localização ao Enviar Oferta**

```typescript
async function criarOfertaComLocalizacao(embarqueId, motoristaId, score) {
    // 1. Buscar última localização
    const ultimaLocalizacao = await buscarUltimaLocalizacao(motoristaId);
    
    // 2. Criar oferta
    const oferta = await directus.request(
        createItem('vehicle_matches', {
            embarque_id: embarqueId,
            motorista_id: motoristaId,
            score_compatibilidade: score,
            // Adicionar campos de localização
            latitude_oferta: ultimaLocalizacao?.latitude,
            longitude_oferta: ultimaLocalizacao?.longitude,
            timestamp_localizacao_oferta: ultimaLocalizacao?.timestamp,
            created_at: new Date().toISOString()
        })
    );
    
    return oferta;
}
```

---

## 📋 Checklist de Ações

- [ ] **1. Definir critérios comerciais reais**
  - Quais são os critérios? (margem, preferências, etc)
  - Como calcular score comercial?
  
- [ ] **2. Mudar disponibilidade para lógica binária**
  - Filtrar motoristas disponíveis primeiro
  - Usar tempo para ordenação, não score
  
- [ ] **3. Implementar uso de `location_history`**
  - Buscar última localização real do motorista
  - Calcular distância usando coordenadas reais
  
- [ ] **4. Registrar localização ao enviar oferta**
  - Adicionar campos em `vehicle_matches` ou
  - Usar `location_history` vinculado à oferta

---

## ❓ Perguntas para Definir

1. **Critérios Comerciais:**
   - Quais são os critérios comerciais que devem ser considerados?
   - Existe preferência por determinados motoristas?
   - Margem de lucro é um fator?
   
2. **Disponibilidade:**
   - Motoristas "retornando" devem receber ofertas?
   - Qual o limite de tempo? (6h? 12h?)
   - Ou apenas motoristas "disponivel" devem receber?
   
3. **Localização:**
   - A tabela `location_history` está sendo populada?
   - Com que frequência os GPSs atualizam?
   - Devemos considerar apenas última localização ou média das últimas X horas?

---

**Data da Análise:** 2026-01-12  
**Status:** ⚠️ Aguardando definições para implementação
