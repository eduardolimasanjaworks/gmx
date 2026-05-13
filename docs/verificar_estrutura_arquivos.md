# Como o Directus Gerencia Arquivos

## 📁 Arquitetura de Arquivos no Directus

O Directus **NÃO armazena arquivos binários no PostgreSQL**. Ele funciona assim:

### 1. **Armazenamento Físico dos Arquivos**
- Os arquivos (JPG, PDF, etc.) são salvos no **sistema de arquivos** do servidor (ou S3, Azure, etc.)
- Por padrão, ficam em: `./uploads/` no servidor do Directus
- Cada arquivo recebe um nome único (hash UUID) no disco

### 2. **Metadados no PostgreSQL**
- O Directus cria uma collection especial: `directus_files`
- Esta collection armazena apenas **METADADOS** do arquivo:
  - `id` (UUID) - identificador único
  - `filename_disk` - nome do arquivo no disco
  - `filename_download` - nome original do arquivo
  - `type` - MIME type (image/jpeg, application/pdf, etc.)
  - `filesize` - tamanho em bytes
  - `storage` - onde está armazenado (local, s3, etc.)
  - `title`, `description`, etc.

### 3. **Relacionamento nas Collections**
- Suas collections (`delivery_receipts`, `payment_receipts`, `shipment_documents`) têm um campo `file` do tipo **UUID**
- Este campo faz uma relação **Many-to-One (M2O)** com `directus_files`
- O PostgreSQL armazena apenas o UUID, não o arquivo em si

## 🔍 Estrutura no Banco de Dados

```
PostgreSQL:
├── directus_files (collection do Directus)
│   ├── id (UUID) ← Chave primária
│   ├── filename_disk
│   ├── filename_download
│   ├── type (MIME)
│   └── filesize
│
└── delivery_receipts (sua collection)
    ├── id
    ├── shipment_id
    ├── file (UUID) ← Referência para directus_files.id
    └── ... outros campos
```

## ✅ Verificação: Suas Collections Estão Prontas?

Sim! Suas collections estão configuradas corretamente:

1. ✅ Campo `file` do tipo UUID existe
2. ✅ Relação M2O com `directus_files` está configurada
3. ✅ Campo `file_name` e `file_size` para metadata adicional
4. ✅ Campo `file_url` para compatibilidade legacy (opcional)

## 🚀 Fluxo de Upload

1. **Upload do arquivo** → Directus salva no disco e cria registro em `directus_files`
2. **Retorna UUID** → O Directus retorna o `id` (UUID) do arquivo
3. **Criar registro** → Você cria um registro na sua collection com `file: uuid`
4. **Acesso ao arquivo** → Via URL: `/assets/{uuid}` ou relacionamento

## ⚠️ O Que Pode Estar Faltando

1. **Permissões** - Execute `setup_documents_permissions.js`
2. **Storage configurado** - Verifique Settings > File Storage no Directus
3. **Diretório de uploads** - Deve existir e ter permissões de escrita
