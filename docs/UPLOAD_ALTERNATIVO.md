# Upload alternativo (ignorando Directus Files)

O Directus do servidor está retornando **503** em `POST /files` (serviço de arquivos indisponível).  
Para continuar operando, o frontend foi ajustado para suportar upload via **Supabase Storage** e salvar no Directus apenas o **metadata + URL** (campo `file_url`), sem depender de `directus_files`.

## Como habilitar (Supabase Storage)

1. Crie um bucket no Supabase e deixe **Public**.
   - Recomendado: `gmx-uploads` (já incluímos uma migration SQL pronta para isso em `supabase/migrations/20260127190000_public_storage_uploads.sql`)
2. Configure estas variáveis no `.env` do Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_BUCKET=gmx-uploads`
- `VITE_UPLOAD_STRATEGY`:
  - `supabase` (ignora Directus `/files` e usa só Supabase) **(default)**
  - `auto` (tenta Directus e faz fallback para Supabase quando vier 503)
  - `directus` (força Directus `/files`)

3. Reinicie o Vite.

## Onde foi aplicado

- `src/components/shipment/ShipmentDetailsDialog.tsx`: upload faz fallback para Supabase quando Directus retornar 503; grava `file_url` no Directus.
- `src/integrations/supabase/client.ts`: usa Supabase real quando as env vars existem; caso contrário, mantém um mock para não quebrar.

## Upload via HTTP (sem frontend)

### cURL (Linux/Mac/WSL)

Subir arquivo (PDF/JPG/PNG):

```bash
curl -X POST "$SUPABASE_URL/storage/v1/object/gmx-uploads/shipments/63/$(date +%s)-arquivo.pdf" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/pdf" \
  --data-binary "@./arquivo.pdf"
```

URL pública gerada:

```bash
echo "$SUPABASE_URL/storage/v1/object/public/gmx-uploads/shipments/63/<NOME_DO_ARQUIVO>"
```

### PowerShell (Windows)

```powershell
$SUPABASE_URL = "https://SEU-PROJETO.supabase.co"
$SUPABASE_ANON_KEY = "SUA_ANON_KEY"
$bucket = "gmx-uploads"
$path = "shipments/63/$([int][double]::Parse((Get-Date -UFormat %s)))-arquivo.pdf"
$file = "C:\\caminho\\arquivo.pdf"

Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/storage/v1/object/$bucket/$path" `
  -Headers @{ apikey = $SUPABASE_ANON_KEY; Authorization = "Bearer $SUPABASE_ANON_KEY"; "Content-Type" = "application/pdf" } `
  -InFile $file

Write-Host "Public URL:" "$SUPABASE_URL/storage/v1/object/public/$bucket/$path"
```

