# 📱 Guia de Configuração de Notificações

## 🎯 Visão Geral

O sistema suporta **3 canais de notificação**:

1. ✅ **WhatsApp Business API** (Recomendado)
2. ✅ **SMS via Twilio**
3. ✅ **Push Notification via Firebase**

Você pode ativar **todos**, **alguns** ou **nenhum**. O sistema se adapta automaticamente.

---

## 📋 Opção 1: WhatsApp Business API (Meta/Facebook)

### **Por que usar?**
- ✅ Mais barato que SMS (R$ 0,02 por mensagem)
- ✅ Taxa de abertura de 98%
- ✅ Suporta imagens, botões e templates
- ✅ Motoristas já usam WhatsApp

### **Como configurar:**

#### **Passo 1: Criar conta Meta Business**
1. Acesse: https://business.facebook.com
2. Crie uma conta Business
3. Adicione um número de telefone

#### **Passo 2: Ativar WhatsApp Cloud API**
1. Acesse: https://developers.facebook.com/apps
2. Crie um app → Escolha "Business"
3. Adicione produto "WhatsApp"
4. Vá em "API Setup"

#### **Passo 3: Obter credenciais**
```
WHATSAPP_API_URL = https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN = (copiar do painel)
WHATSAPP_PHONE_ID = (copiar do painel)
```

#### **Passo 4: Criar template de mensagem**
1. No painel do WhatsApp Business
2. Ir em "Message Templates"
3. Criar template chamado `oferta_frete`:

```
Olá {{1}}, nova oferta disponível!

📦 Carga: {{2}} → {{3}}
🚚 Produto: {{4}}

Acesse o app GMX para aceitar!
```

4. Aguardar aprovação (24-48h)

#### **Passo 5: Adicionar ao .env**
```bash
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxx
WHATSAPP_PHONE_ID=123456789012345
```

### **Custo:**
- Primeiras 1.000 mensagens/mês: **GRÁTIS**
- Após isso: **R$ 0,02 por mensagem**

---

## 📋 Opção 2: SMS via Twilio

### **Por que usar?**
- ✅ Funciona em qualquer celular (não precisa app)
- ✅ Confiável (99.9% de entrega)
- ✅ Backup se WhatsApp falhar

### **Como configurar:**

#### **Passo 1: Criar conta Twilio**
1. Acesse: https://www.twilio.com/try-twilio
2. Crie conta gratuita (ganha $15 de crédito)

#### **Passo 2: Obter número de telefone**
1. No painel Twilio
2. Phone Numbers → Buy a Number
3. Escolher número brasileiro (+55)

#### **Passo 3: Obter credenciais**
1. Ir em "Account" → "API Keys"
2. Copiar:
   - Account SID
   - Auth Token

#### **Passo 4: Adicionar ao .env**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+5511999999999
```

### **Custo:**
- **R$ 0,15 por SMS** (Brasil)
- Crédito inicial: R$ 75 (grátis)

---

## 📋 Opção 3: Push Notification (Firebase)

### **Por que usar?**
- ✅ Instantâneo (aparece na tela do celular)
- ✅ Gratuito (ilimitado)
- ✅ Funciona mesmo com app fechado

### **Como configurar:**

#### **Passo 1: Criar projeto Firebase**
1. Acesse: https://console.firebase.google.com
2. Criar novo projeto
3. Adicionar app Android/iOS

#### **Passo 2: Ativar Cloud Messaging**
1. No painel Firebase
2. Build → Cloud Messaging
3. Copiar "Server Key"

#### **Passo 3: Adicionar ao .env**
```bash
FIREBASE_SERVER_KEY=AAAAxxxxxxxxxx:APA91bFxxxxxxxx
```

#### **Passo 4: Integrar no app mobile**
```javascript
// No app React Native/Flutter
import messaging from '@react-native-firebase/messaging';

// Salvar token no banco quando motorista faz login
const fcmToken = await messaging().getToken();
await salvarTokenNoBanco(motorista.id, fcmToken);
```

### **Custo:**
- **100% GRATUITO** (ilimitado)

---

## ⚙️ Configuração Final

### **1. Copiar arquivo de exemplo**
```bash
cp .env.example .env
```

### **2. Preencher credenciais**
```bash
# Editar .env
nano .env

# Adicionar suas credenciais
WHATSAPP_API_TOKEN=seu_token_aqui
TWILIO_ACCOUNT_SID=seu_sid_aqui
FIREBASE_SERVER_KEY=sua_key_aqui
```

### **3. Testar configuração**
```bash
# Executar teste
node -r ts-node/register src/services/notificationService.ts
```

Saída esperada:
```
═══════════════════════════════════════════════════
📱 STATUS DAS NOTIFICAÇÕES
═══════════════════════════════════════════════════
WhatsApp: ✅ Configurado
SMS:      ✅ Configurado
Push:     ✅ Configurado
═══════════════════════════════════════════════════
```

---

## 🧪 Testar Envio

### **Teste Manual:**
```typescript
import { notificarMotorista } from '@/services/notificationService';

await notificarMotorista('motorista-id-123', {
  motoristaNome: 'João Silva',
  motoristaWhatsApp: '11999999999',
  embarqueId: 'abc123',
  origem: 'São Paulo, SP',
  destino: 'Rio de Janeiro, RJ',
  produto: 'Milho',
  peso: 28000,
  valorFrete: 3500,
  scoreCompatibilidade: 94,
});
```

---

## 💰 Comparação de Custos

| Canal | Custo/Mensagem | Taxa de Abertura | Velocidade |
|-------|----------------|------------------|------------|
| **WhatsApp** | R$ 0,02 | 98% | Instantâneo |
| **SMS** | R$ 0,15 | 90% | Instantâneo |
| **Push** | Grátis | 70% | Instantâneo |

### **Recomendação:**
1. **WhatsApp** como principal (mais barato e eficaz)
2. **SMS** como backup (se WhatsApp falhar)
3. **Push** sempre ativo (grátis)

---

## 🔧 Troubleshooting

### **Problema: WhatsApp retorna erro 403**
**Solução:** Verificar se o token está válido e se o número está verificado

### **Problema: SMS não chega**
**Solução:** Verificar se o número está no formato internacional (+5511999999999)

### **Problema: Push não aparece**
**Solução:** Verificar se o motorista tem FCM token salvo no banco

---

## 📊 Monitoramento

### **Ver logs de envio:**
```bash
tail -f logs/notifications.log
```

### **Estatísticas:**
```sql
-- Ver taxa de entrega
SELECT 
  canal,
  COUNT(*) as total,
  SUM(CASE WHEN entregue THEN 1 ELSE 0 END) as entregues,
  ROUND(100.0 * SUM(CASE WHEN entregue THEN 1 ELSE 0 END) / COUNT(*), 2) as taxa_entrega
FROM notificacoes_log
GROUP BY canal;
```

---

## 🚀 Próximos Passos

1. ✅ Configurar pelo menos 1 canal (WhatsApp recomendado)
2. ✅ Testar envio manual
3. ✅ Ativar auto-matching
4. ✅ Monitorar logs

---

**Versão:** 1.0.0  
**Atualizado:** Janeiro 2026
