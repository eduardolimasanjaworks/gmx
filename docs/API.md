# Documentação GMX Frete Sync (Personalizada)

Esta documentação é específica para o fluxo de trabalho do GMX Frete Sync, focando nas operações críticas de gerenciamento de motoristas e frota.

## 🔐 Autenticação (Obrigatória)

Para acessar os endpoints de escrita (POST/PATCH), você precisa enviar o **Token de Acesso** no cabeçalho da requisição.

**Header:**
`Authorization: Bearer 1nuqaAuhjy-3bURuLhfu5o5JbLHLO4Ah`

> **Nota:** Use este token estático para desenvolvimento. 

---

## 🚛 Fluxo de Cadastro de Motorista

O cadastro de motorista é a entidade central do sistema. Ele centraliza dados pessoais, bancários e documentos regulatórios.

### 1. Criar Motorista Completo (Fluxo Unificado)
Este endpoint é o principal para o cadastro. Ele deve ser usado para preencher as tabelas:
*   `cadastro_motorista` (Dados Básicos)
*   `cnh` (via alias `dados_cnh`)
*   `antt` (via alias `dados_antt`)
*   `crlv` (via alias `dados_crlv`)
*   `comprovante_endereco` (via alias `dados_endereco`)
*   `fotos` (via alias `fotos`)
*   `carreta` (via alias `carreta1`, `carreta2`...)

**Endpoint:** `POST /items/cadastro_motorista`

**Estrutura do JSON (Exemplo Completo):**
```json
{
  "status": "published",
  "nome": "NOME DO MOTORISTA",
  "sobrenome": "SOBRENOME",
  "telefone": "5511999999999",
  "forma_pagamento": "pix",
  
  // 1. Relacionamento com a Tabela Carreta
  // (Mapeia para tabela carreta_1, carreta_2...)
  "carreta1": [
      {
          "placa": "ABC-1234",
          "modelo": "GRANELEIRA",
          "renavam": "12345678900",
          "cap": "30 TON"
      }
  ],

  // 2. Relacionamento com a Tabela Fotos (Links/UUIDs)
  // Nota: Directus exige array para relacionamentos, mesmo sendo 1:1 lógico no seu fluxo
  "fotos": [
     {
        "foto_cavalo": "UUID-OU-URL-DA-IMAGEM",
        "foto_lateral": "UUID-OU-URL-DA-IMAGEM",
        "foto_traseira": "UUID-OU-URL-DA-IMAGEM"
     }
  ],
  
  // 3. Tabela CNH
  "dados_cnh": [
    {
      "n_registro_cnh": "12345678900",
      "categoria": "AE",
      "validade": "2025-12-31"
    }
  ],
  
  // 4. Tabela ANTT
  "dados_antt": [
    {
      "numero_antt": "12345678",
      "cnpj_cpf": "123.456.789-00"
    }
  ],
  
  // 5. Tabela CRLV (Documento do Veículo)
  "dados_crlv": [
      {
          "placa": "ABC-1234",
          "renavam": "12345678900"
      }
  ],
  
  // 6. Tabela Comprovante de Endereço
  "dados_endereco": [
    {
      "logradouro": "Rua das Flores",
      "numero": "123",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01001-000"
    }
  ],

  // 7. Tabela Disponibilidade (Status inicial do motorista)
  "dados_disponibilidade": [
      {
         "status": "disponivel",
         "localizacao_atual": "Centro de SP (Criado na Origem)",
         "latitude": -23.55052,
         "longitude": -46.633308,
         "observacao": "Disponível imediatamente após cadastro."
      }
  ]
}
```

> **Nota:** Para enviar as fotos, você ainda precisa fazer o upload dos arquivos antes `/files` para obter os UUIDs.

---


> **Nota:** No Frontend, a visualização usa a URL: `http://91.99.137.101:8057/assets/<UUID_DA_IMAGEM>`

---

## 🟢 Controle de Disponibilidade

Tabela `disponivel` controla onde o motorista está e se está livre para carga.

**Endpoint:** `GET /items/disponivel`

**Filtros Comuns:**
*   **Apenas disponíveis:** `?filter[status][_eq]=disponivel`
*   **Por Região:** `?filter[localizacao_atual][_contains]=SP`

**Atualizar Status:**
`PATCH /items/disponivel/<ID_DO_REGISTRO>`
```json
{
  "status": "indisponivel", // Opções: 'disponivel' ou 'indisponivel'
  "data_previsao_liberacao": "2024-12-20T18:00:00"
}
```

---

## ⚠️ Tratamento de Erros Comuns

*   **RECORD_NOT_UNIQUE:** Ocorre se tentar cadastrar um CPF ou Placa já existentes. O Frontend deve capturar isso e alertar "Motorista já cadastrado".
*   **FORBIDDEN:** Verifique se o Token Bearer está presente no header `Authorization`.

---

## 🔎 8. Fluxo de Busca e Atualização (Operação Diária)

### Passo 1: Encontrar Motorista (Pelo Telefone ou CPF)
Antes de lançar uma nova disponibilidade, você precisa descobrir o ID do motorista.

**Endpoint:** `GET /items/cadastro_motorista`

**Exemplo de Filtro (Telefone):**
`?filter[telefone][_eq]=5511999999999`

**Exemplo de Filtro (CPF):**
`?filter[cpf][_eq]=123.456.789-00`

**Resposta:**
```json
{
    "data": [
        {
            "id": 15,  // <--- GUARDE ESSE ID
            "nome": "João",
            "telefone": "5511999999999"
        }
    ]
}
```

---

### Passo 2: Lançar Nova Disponibilidade (Mudar de Cidade)
Quando o motorista muda de cidade, você **CRIAR UM NOVO REGISTRO** (não atualiza o antigo), para manter o histórico.

**Endpoint:** `POST /items/disponivel`

**Exemplo de JSON:**
```json
{
  "status": "disponivel",
  "motorista_id": 15,   // <--- ID descoberto no Passo 1
  "localizacao_atual": "Rio de Janeiro - RJ",
  "observacao": "Chegou agora, vazio."
}
```

---

### Passo 3: Baixar Disponibilidade (Ficou Indisponível)
Quando ele carrega ou vai dormir, você atualiza o status dele para sair da fila.

**Endpoint (Busca ID da Disponibilidade Atual):**
`GET /items/disponivel?filter[motorista_id][_eq]=15&filter[status][_eq]=disponivel`

**Endpoint (Atualiza Status):**
`PATCH /items/disponivel/<ID_DA_DISPONIBILIDADE>`
```json
{
  "status": "indisponivel",
  "observacao": "Carregado para Bahia"
}
```
