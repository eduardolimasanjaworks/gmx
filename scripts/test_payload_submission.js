
import fs from 'fs';

const DIRECTUS_URL = "http://91.99.137.101:8057/items/cadastro_motorista";
const TOKEN = "1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah";

const PAYLOAD = {
    "status": "published",
    "nome": "MOTORISTA V4 FINAL",
    "sobrenome": "SOBRENOME",
    "telefone": "5511999999999",
    "forma_pagamento": "pix",

    "carreta1": [
        {
            "placa": "ABC-1234",
            "modelo": "GRANELEIRA",
            "renavam": "12345678900",
            "cap": "30 TON"
        }
    ],

    "fotos": [
        {
            "foto_cavalo": "https://link-da-imagem.com/cavalo.jpg",
            "foto_lateral": "https://link-da-imagem.com/lateral.jpg",
            "foto_traseira": "https://link-da-imagem.com/traseira.jpg"
        }
    ],

    "dados_cnh": [
        {
            "n_registro_cnh": "12345678900",
            "categoria": "AE",
            "validade": "2025-12-31"
        }
    ],

    "dados_antt": [
        {
            "numero_antt": "12345678",
            "cnpj_cpf": "123.456.789-00"
        }
    ],

    "dados_endereco": [
        {
            "logradouro": "Rua das Flores",
            "numero": "123",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01001-000"
        }
    ]
};

async function submitTest() {
    console.log("🚀 Submitting Test Payload...");
    console.log("Header: Authorization: Bearer " + TOKEN.substring(0, 5) + "...");

    try {
        const res = await fetch(DIRECTUS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify(PAYLOAD)
        });

        if (res.ok) {
            const json = await res.json();
            console.log("✅ SUCCESS! Record created ID:", json.data.id);
            console.log("Response:", JSON.stringify(json, null, 2));
        } else {
            console.log(`❌ FAILED (${res.status})`);
            const text = await res.text();
            console.log("Response:", text);
        }

    } catch (e) {
        console.error("❌ Network Error:", e);
    }
}

submitTest();
