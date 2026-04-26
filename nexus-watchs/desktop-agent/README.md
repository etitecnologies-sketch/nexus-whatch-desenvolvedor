# Nexus Watch Desktop Agent

Este é o servidor Python standalone que roda localmente para se comunicar com DVRs/NVRs Intelbras e Dahua.

## Requisitos

```
pip install -r requirements.txt
```

## Iniciar

```bash
python server.py
```

O servidor ficará disponível em `http://localhost:7000`

## API Endpoints

- `GET /` - Status do servidor
- `GET /health` - Health check
- `POST /devices/connect` - Conectar a um dispositivo
- `DELETE /devices/{device_id}/disconnect` - Desconectar dispositivo
- `GET /devices/{device_id}/status` - Verificar status
- `GET /devices/{device_id}/info` - Informações do dispositivo
- `GET /devices/{device_id}/channels` - Listar canais
- `POST /stream/start` - Iniciar stream via MediaMTX
- `DELETE /stream/{stream_name}` - Parar stream
- `GET /devices/{device_id}/snapshot/{channel}` - Captura de imagem
- `POST /devices/{device_id}/ptz/{channel}/{direction}` - Controle PTZ
- `POST /devices/{device_id}/ptz/{channel}/stop` - Parar PTZ
- `GET /devices/{device_id}/recordings` - Listar gravações
