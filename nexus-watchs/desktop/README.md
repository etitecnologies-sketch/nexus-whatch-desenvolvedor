# Nexus Watch Desktop

Aplicativo desktop Electron para visualização de câmeras DVR/NVR.

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run electron:dev
```

## Build

```bash
npm run electron:build
```

## Estrutura

- `electron/` — Código principal do Electron (main.js, preload.js)
- `src/` — Código React do frontend
- `mediamtx/` — Servidor MediaMTX para streaming RTSP→HLS
