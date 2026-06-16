# services

`telemetry-store.ts` centraliza gravação e leitura de presença no **Directus**.

Coleção esperada:
- `telemetria_eventos`

Campos esperados (mínimo):
- `event_type` (string)
- `tab_id` (string)
- `tab_state` (string)
- `user_email` (string)
- `user_name` (string)
- `directus_user_id` (string)
- `current_path` (string)
- `metadata_json` (text/json string)
- `event_at` (datetime)

Obs: se a coleção não existir ou o usuário não tiver permissão, a feature não quebra a UI; apenas não grava/consulta eventos.
