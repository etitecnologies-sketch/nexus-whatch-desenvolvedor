# Nexus Watch Cloud + Agentes

Este projeto é a versão unificada do Nexus Watch:

- `cloud/`: servidor (API + WebSocket) que recebe métricas dos agentes
- `agent/`: agente (Go) que roda nos clientes e envia métricas para a nuvem

## Rodar local (Docker)

```bash
docker compose up --build
```

Serviços:

- Cloud API: `http://localhost:3000/health`
- WebSocket: `ws://localhost:3000` (Socket.IO)

## Variáveis

Veja `cloud/.env.example`.

## Assinatura das métricas

O agente envia as métricas com assinatura HMAC para garantir autenticidade:

- Header `X-Device-Token`: identificador do device cadastrado no Cloud
- Header `X-NX-Timestamp`: epoch seconds
- Header `X-NX-Signature`: `HMAC_SHA256(INGEST_SECRET, "<ts>.<rawBody>")` (hex)

No agente, configure:

- `NEXUS_WATCH_CLOUD_URL`
- `DEVICE_TOKEN`
- `INGEST_SECRET`

## Deploy (Railway)

- Root Directory: `nexus-watch/cloud`
- Variables:
  - `DATABASE_URL` (Postgres)
  - `JWT_SECRET`
  - `AUTH_MODE=local`
  - `LOCAL_AUTH_USER`
  - `LOCAL_AUTH_PASSWORD`
  - `CORS_ORIGIN` (opcional)
