# 🎯 Integração com n8n - Guia Rápido

## ✅ O QUE FOI IMPLEMENTADO

O sistema agora envia **automaticamente** os dados da oferta para o seu webhook n8n:

```
https://davihofmann.app.n8n.cloud/webhook/121f31d3-fad6-46e8-8848-f7c830090e00
```

---

## 📦 DADOS ENVIADOS

Toda vez que o sistema cria uma oferta, ele envia um **POST** com este JSON:

```json
{
  "tipo": "nova_oferta",
  "timestamp": "2026-01-12T16:55:00.000Z",
  
  "motorista": {
    "id": "abc-123-def",
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  
  "carga": {
    "embarque_id": "xyz-789-uvw",
    "origem": "São Paulo, SP",
    "destino": "Rio de Janeiro, RJ",
    "produto": "Milho",
    "peso_kg": 28000,
    "valor_frete": 3500,
    "data_coleta": "2026-01-15",
    "urgencia": "media"
  },
  
  "matching": {
    "score": 94,
    "justificativa": {
      "disponibilidade": "Disponível em 1.5h",
      "equipamento": "Equipamento compatível",
      "localizacao": "90 km da origem",
      "historico": "120 viagens concluídas",
      "comercial": "Documentação OK"
    }
  },
  
  "mensagem_sugerida": "🚚 Nova Oferta de Frete!\n\nOlá João Silva..."
}
```

---

## 🔧 O QUE FAZER NO N8N

### **Passo 1: Receber o Webhook**
O webhook já está configurado. Ele vai receber o POST automaticamente.

### **Passo 2: Processar os Dados**
No n8n, você pode:

1. **Extrair dados:**
   ```javascript
   const motorista = $json.motorista.nome;
   const telefone = $json.motorista.telefone;
   const origem = $json.carga.origem;
   const destino = $json.carga.destino;
   const score = $json.matching.score;
   ```

2. **Formatar mensagem:**
   ```javascript
   const mensagem = `
   🚚 Nova Oferta!
   
   Olá ${motorista}!
   
   📦 ${origem} → ${destino}
   ✅ Score: ${score}/100
   
   Acesse o app GMX!
   `;
   ```

3. **Enviar via WhatsApp/SMS:**
   - Usar node "HTTP Request" para API do WhatsApp
   - Ou usar node "Twilio" para SMS
   - Ou qualquer outro canal que você preferir

---

## 🧪 TESTAR AGORA

### **1. Testar conexão:**
```bash
cd c:\Users\daviz\OneDrive\Documentos\GMX\versao_atual_dashgmx
node -r ts-node/register src/services/notificationService.ts
```

Você deve ver no n8n um POST com:
```json
{
  "tipo": "teste",
  "timestamp": "...",
  "mensagem": "Teste de conexão do sistema GMX"
}
```

### **2. Simular oferta real:**
No n8n, você receberá algo assim quando o auto-matching rodar:
```json
{
  "tipo": "nova_oferta",
  "motorista": { ... },
  "carga": { ... },
  "matching": { ... }
}
```

---

## 📊 EXEMPLO DE WORKFLOW N8N

```
[Webhook Trigger]
    ↓
[IF] tipo === "nova_oferta"
    ↓
[Set] Formatar mensagem
    ↓
[HTTP Request] Enviar WhatsApp
    ↓
[Directus] Registrar envio
```

---

## ⚙️ CONFIGURAÇÃO (Opcional)

Se quiser mudar a URL do webhook:

```bash
# Editar .env
N8N_WEBHOOK_URL=https://sua-nova-url.com/webhook/xyz
```

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Testar webhook (executar script de teste)
2. ✅ Configurar workflow no n8n
3. ✅ Ativar auto-matching (cron job)
4. ✅ Monitorar logs

---

**Pronto! Agora o sistema envia tudo para o n8n e você controla o envio de mensagens de lá.** 🎉
