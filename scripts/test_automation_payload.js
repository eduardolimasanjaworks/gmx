
import { createDirectus, rest, staticToken, createItem, readItems } from '@directus/sdk';

const DIRECTUS_URL = "http://91.99.137.101:8057";
const DIRECTUS_TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const client = createDirectus(DIRECTUS_URL)
    .with(staticToken(DIRECTUS_TOKEN))
    .with(rest());

const PAYLOAD = {
    status: "active",
    nome: "MOTORISTA AUTOMATICO",
    sobrenome: "TESTE V2",
    cpf: "999.999.999-98", // Changed CPF to avoid conflict
    telefone: "(11) 99999-9999",
    forma_pagamento: "PIX",
    cidade: "SÃO PAULO",
    estado: "SP",
    dados_disponibilidade: [
        {
            status: "disponivel",
            localizacao_atual: "Centro de SP",
            observacao: "Criado automaticamente via API (SDK)",
            latitude: -23.55052,
            longitude: -46.633308,
            data_liberacao: new Date().toISOString()
        }
    ]
};

async function submit() {
    try {
        console.log("Submitting payload with nested availability...");

        const result = await client.request(createItem('cadastro_motorista', PAYLOAD));

        console.log("✅ Success! Driver ID:", result.id);

        // Verify relationship
        const check = await client.request(readItems('disponivel', {
            filter: { motorista_id: { _eq: result.id } }
        }));

        if (check.length > 0) {
            console.log("✅ Availability record found:", check[0].id);
            console.log("   Status:", check[0].status);
            console.log("   Location:", check[0].localizacao_atual);
        } else {
            console.error("❌ Driver created, but Availability record NOT found.");
        }

    } catch (e) {
        // Log detailed error for validation issues
        console.error("Error:", JSON.stringify(e.errors || e.message, null, 2));
    }
}

submit();
