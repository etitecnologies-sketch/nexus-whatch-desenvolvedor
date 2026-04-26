# Plano Estratégico — Nexus Watch Universal

## 1. DIAGNÓSTICO DO PROJETO ATUAL

### Pontos Fortes
- ✅ Estrutura web moderna (React + Vite + TypeScript + tRPC)
- ✅ Sistema de autenticação com Supabase
- ✅ Interface responsiva com shadcn/ui
- ✅ Suporte a DVRs/NVRs via drivers (Intelbras, Hikvision, Dahua, Uniview, Axis)
- ✅ Streaming RTSP via MediaMTX
- ✅ Desktop Agent (Python FastAPI) para uso local
- ✅ Desktop App (Electron) para visualização
- ✅ Estrutura monorepo (client, server, desktop, desktop-agent)

### Pontos Críticos a Corrigir

#### Backend (server/)
1. **getWebStreamUrl não existe nos drivers** — O código em `routers.ts` chama `driver.getWebStreamUrl()` mas `GenericDriver` não tem esse método (só `BaseDriver` tem)
2. **Falha silenciosa no streaming** — Quando MediaMTX não está disponível, o sistema não trata erro adequadamente
3. **P2P só funciona para Intelbras** — Outros fabricantes têm Portais P2P mas não são implementados
4. **Sem cache de stream** — A cada requisição `getStreamUrl`, um novo stream é registrado no MediaMTX (vazamento de recursos)
5. **Status check é síncrono e bloqueante** — Conexões TCP podem travar o event loop

#### Frontend Web (client/)
1. **LiveView tenta usar webStreamUrl** — O componente espera `streamInfo.webStreamUrl` que sempre será null após correção
2. **Sem indicador de qualidade de stream** — Não mostra se é HLS, RTSP direto, ou P2P
3. **Sem fallback para dispositivos offline** — Tela de erro genérica sem opção de retry ou modo P2P
4. **DeviceManagement não salva p2pId corretamente** — O formulário não associa p2pId ao device no banco

#### Database (drizzle/)
1. **Tabela devices não tem campo `channels`** — Não armazena número de canais do DVR
2. **Sem timestamps precisos** — `lastSeen` não é atualizado em tempo real
3. **Sem soft delete** — Exclusão de dispositivos é permanente

#### Desktop App
1. **Electron precisa do MediaMTX externo** — O bundle não inclui o binário mediamtx.exe
2. **Sem comunicação com desktop-agent** — O frontend desktop não se conecta à API Python
3. **Store local não sincroniza com cloud** — Cada instalação é independente

---

## 2. FABRICANTES A ADICIONAR

### Fabricantes Brasileiros (Prioridade Alta)
| Fabricante | Portal P2P | API SDK | ONVIF | RTSP Format |
|------------|-----------|---------|-------|--------------|
| **Intelbras** | remotizze.intelbras.com.br | pyintelbras | Sim | `/cam/realmonitor` |
| **Lampttek** | N/A | Não | Sim | `/cam/realmonitor` |
| **Uniview** | N/A | Não | Sim | `/unicast/cX/sY/live` |
| **Tecsat** | N/A | Não | Sim | `/cam/realmonitor` |
| **Vigitron** | N/A | Não | Sim | Genérico |

### Fabricantes Estrangeiros (Mercado Internacional)
| Fabricante | Portal P2P | API SDK | ONVIF | RTSP Format |
|------------|-----------|---------|-------|--------------|
| **Hikvision** | N/A | isapi | Sim | `/Streaming/Channels/XYY` |
| **Dahua** | N/A | N/A | Sim | `/cam/realmonitor` |
| **Axis** | N/A | VAPIX | Sim | `/axis-media/media.amp` |
| **Bosch** | N/A | BSc3SDK | Sim | `/rtsp_tunnel` |
| **Hanwha (Samsung)** | N/A | Wisenet SDK | Sim | `/profileX/media.smp` |
| **EZ-IPC** | N/A | Não | Sim | `/Streaming/Channels/101` |
| **Tiandy** | N/A | Não | Sim | `/Streaming/Channels/1` |
| **Proveillance** | N/A | Não | Sim | `/cam/realmonitor` |
| **Milestone** | N/A | N/A | Sim | `/Streaming/live` |
| **Geovision** | N/A | N/A | Sim | `/Streaming/Channels/001` |

---

## 3. FUNCIONALIDADES DE MONETIZAÇÃO (Sistema de Assinaturas)

### Plano Gratuito (Starter)
- Até 4 câmeras
- 1 dispositivo (DVR/NVR)
- Visualização ao vivo (HLS)
- Acesso P2P (se fabricante suportar)
- Sem gravações na nuvem

### Planos Pagos
| Recurso | Starter | Pro (R$ 29/mês) | Enterprise (R$ 99/mês) |
|---------|---------|------------------|------------------------|
| Câmeras | 4 | 16 | Ilimitado |
| Dispositivos | 1 | 5 | Ilimitado |
| Gravações na nuvem | ❌ | 7 dias | 30 dias |
| Usuários | 1 | 3 | 10 |
| PTZ | ✅ | ✅ | ✅ |
| Analytics (motion) | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ |
| Suporte | Email | Prioritário | Dedicado |

### Funcionalidades a Implementar
1. **Sistema de Planos** — Tabela `plans`, `subscriptions` no banco
2. **Limite de Uso** — Middleware que verifica limits antes de permitir adicionar device/camera
3. **Faturas** — Integração Stripe/PagSeguro para cobrança recorrente
4. **Tokens de API** — Para clientes Enterprise integrarem via API
5. **Trial de 14 dias** — Novos usuários têm acesso Pro temporário

---

## 4. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: Correções Críticas (1-2 semanas)
1. [ ] Corrigir `getWebStreamUrl` em todos os drivers ou remover chamada
2. [ ] Implementar cache de streams no MediaMTX (evitar duplicates)
3. [ ] Adicionar campo `channels` na tabela devices
4. [ ] Corrigir formulário DeviceManagement para salvar p2pId
5. [ ] LiveView mostrar botão P2P quando webStreamUrl é null

### Fase 2: Novos Fabricantes (2-3 semanas)
1. [ ] Adicionar drivers: Bosch, Hanwha, Tiandy, EZ-IPC, Geovision
2. [ ] Implementar fallback genérico ONVIF para fabricantes desconhecidos
3. [ ] Portal P2P genérico configurável por fabricante
4. [ ] Auto-detecção de fabricante via ONVIF GetDeviceInfo

### Fase 3: Monetização (3-4 semanas)
1. [ ] Tabelas de planos e assinaturas
2. [ ] Middleware de rate limiting por plano
3. [ ] Integração com gateway de pagamento
4. [ ] Painel admin para gerenciar assinaturas
5. [ ] Sistema de trials e upgrades

### Fase 4: Diferenciais Competitivos (4-6 semanas)
1. [ ] Detecção de movimento via IA (TensorFlow.js no browser)
2. [ ] Notificações push (Web Push API)
3. [ ] Gravações sob demanda (clip de 30s após motion)
4. [ ] Time-lapse de 24h
5. [ ] App mobile (React Native ou Tauri)

---

## 5. ARQUITETURA PROPOSTA

```
┌─────────────────────────────────────────────────────────────────┐
│                         NEXUS WATCH                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Web App │  │ Desktop  │  │  Mobile  │  │  Embed   │       │
│  │ (React)  │  │(Electron)│  │  (React  │  │ (Widget) │       │
│  │          │  │          │  │  Native) │  │          │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │              │
│       └─────────────┴─────────────┴─────────────┘              │
│                         │                                      │
│                    ┌────▼────┐                                 │
│                    │   API   │                                 │
│                    │ Gateway │                                 │
│                    └────┬────┘                                 │
│         ┌──────────────┼──────────────┐                        │
│   ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐                  │
│   │  Streaming│  │  Devices  │  │ Billing & │                  │
│   │  Service  │  │  Service  │  │  Plans    │                  │
│   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘                  │
│         │              │              │                         │
│   ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐                  │
│   │  MediaMTX │  │  Drivers  │  │ Stripe/   │                  │
│   │  (Stream) │  │  Registry │  │ PagSeguro │                  │
│   └───────────┘  └───────────┘  └───────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. PRÓXIMOS PASSOS IMEDIATOS

1. **Corrigir bugs críticos** — Sem isso, sistema não funciona
2. **Adicionar 3-5 fabricantes novos** — Para mostrar universalidade
3. **Criar driver genérico ONVIF** — Detecta automaticamente fabricante e capabilities
4. **Testar streaming end-to-end** — Verificar se HLS funciona com MediaMTX

---

*Documento preparado para ETI Tecnologies — Nexus Watch Universal*
*Versão: 1.0 | Data: 2025*
