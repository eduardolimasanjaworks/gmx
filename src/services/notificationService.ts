/**
 * Serviço de Notificações via Webhook n8n
 * Envia dados da oferta para o n8n processar o envio
 */

import axios from 'axios';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://davihofmann.app.n8n.cloud/webhook/121f31d3-fad6-46e8-8848-f7c830090e00';

interface DadosOferta {
    motorista_id: string;
    motorista_nome: string;
    motorista_telefone: string;
    embarque_id: string;
    origem: string;
    destino: string;
    produto: string;
    peso_kg: number;
    valor_frete?: number;
    score_compatibilidade: number;
    data_coleta?: string;
    urgencia?: string;
    justificativa?: {
        disponibilidade: string;
        equipamento: string;
        localizacao: string;
        historico: string;
        comercial: string;
    };
}

/**
 * Envia notificação de oferta via webhook n8n
 */
export async function notificarMotoristaViaWebhook(dados: DadosOferta): Promise<boolean> {
    try {
        console.log(`[WEBHOOK] Enviando oferta para ${dados.motorista_nome}...`);

        const response = await axios.post(N8N_WEBHOOK_URL, {
            // Dados principais
            tipo: 'nova_oferta',
            timestamp: new Date().toISOString(),

            // Dados do motorista
            motorista: {
                id: dados.motorista_id,
                nome: dados.motorista_nome,
                telefone: dados.motorista_telefone,
            },

            // Dados da carga
            carga: {
                embarque_id: dados.embarque_id,
                origem: dados.origem,
                destino: dados.destino,
                produto: dados.produto,
                peso_kg: dados.peso_kg,
                valor_frete: dados.valor_frete,
                data_coleta: dados.data_coleta,
                urgencia: dados.urgencia || 'media',
            },

            // Score e justificativa
            matching: {
                score: dados.score_compatibilidade,
                justificativa: dados.justificativa,
            },

            // Mensagem sugerida (n8n pode usar ou customizar)
            mensagem_sugerida: gerarMensagemSugerida(dados),
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 segundos
        });

        if (response.status >= 200 && response.status < 300) {
            console.log(`[WEBHOOK] ✅ Oferta enviada com sucesso para ${dados.motorista_nome}`);
            console.log(`[WEBHOOK] Resposta n8n:`, response.data);
            return true;
        } else {
            console.error(`[WEBHOOK] ⚠️ Status inesperado: ${response.status}`);
            return false;
        }
    } catch (error: any) {
        if (error.code === 'ECONNABORTED') {
            console.error('[WEBHOOK] ❌ Timeout: n8n não respondeu em 10s');
        } else if (error.response) {
            console.error(`[WEBHOOK] ❌ Erro HTTP ${error.response.status}:`, error.response.data);
        } else if (error.request) {
            console.error('[WEBHOOK] ❌ Sem resposta do n8n. Verificar conectividade.');
        } else {
            console.error('[WEBHOOK] ❌ Erro:', error.message);
        }
        return false;
    }
}

/**
 * Gera mensagem sugerida para o n8n usar
 */
function gerarMensagemSugerida(dados: DadosOferta): string {
    const valorTexto = dados.valor_frete
        ? `\n💰 Valor: R$ ${dados.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '';

    return `
🚚 *Nova Oferta de Frete!*

Olá ${dados.motorista_nome}, você foi selecionado para uma nova carga!

📦 *Detalhes:*
• Produto: ${dados.produto}
• Peso: ${(dados.peso_kg / 1000).toFixed(1)} toneladas
• Origem: ${dados.origem}
• Destino: ${dados.destino}${valorTexto}

✅ *Score de Compatibilidade: ${dados.score_compatibilidade}/100*

👉 Acesse o app GMX para aceitar!
  `.trim();
}

/**
 * Testa a conexão com o webhook
 */
export async function testarWebhook(): Promise<boolean> {
    try {
        console.log('[WEBHOOK] Testando conexão com n8n...');

        const response = await axios.post(N8N_WEBHOOK_URL, {
            tipo: 'teste',
            timestamp: new Date().toISOString(),
            mensagem: 'Teste de conexão do sistema GMX',
        }, {
            timeout: 5000,
        });

        console.log('[WEBHOOK] ✅ Conexão OK!');
        console.log('[WEBHOOK] Resposta:', response.data);
        return true;
    } catch (error: any) {
        console.error('[WEBHOOK] ❌ Falha no teste:', error.message);
        return false;
    }
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testarWebhook().then(() => process.exit(0));
}
