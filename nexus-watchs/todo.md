# Nexus Watch - TODO

## Banco de Dados e Esquema
- [x] Criar tabelas: devices, cameras, favorites, notifications, alerts, ptz_presets
- [x] Implementar relacionamentos entre tabelas
- [x] Executar migrações SQL

## Autenticação
- [x] Implementar login com email/senha (via Supabase)
- [x] Implementar cadastro de novo usuário (via Supabase)
- [x] Implementar recuperação de conta (via Supabase)
- [x] Criar telas de autenticação (login, cadastro, recuperação)
- [x] Implementar sessão persistente

## Gerenciamento de Dispositivos
- [x] Criar página de gerenciamento de dispositivos
- [x] Implementar adição de dispositivos (IP/DDNS, P2P, QR Code) - Backend
- [ ] Implementar edição de dispositivos
- [x] Implementar exclusão de dispositivos - Backend
- [x] Exibir status online/offline com latência - Backend
- [x] Criar formulário de configuração de dispositivos

## Visualização ao Vivo (Live View)
- [x] Criar página de Live View
- [x] Implementar grade de câmeras com suporte a 16 câmeras
- [x] Implementar modos de layout (1, 4, 9, 16 canais)
- [x] Implementar seleção de qualidade (HD/SD)
- [x] Implementar zoom digital
- [x] Implementar modo fullscreen
- [ ] Implementar captura de snapshot
- [ ] Implementar gravação local de vídeo

## Reprodução (Playback)
- [x] Criar página de Playback
- [x] Implementar timeline interativa
- [x] Implementar busca por data e hora
- [x] Implementar controle de velocidade (0.125x até 8x)
- [x] Implementar filtros (movimento, gravação contínua)

## Favoritos
- [x] Criar sistema de favoritos
- [x] Implementar agrupamento de câmeras por local
- [x] Implementar atalhos para visualização rápida
- [x] Criar interface de gerenciamento de favoritos

## Notificações e Alarmes
- [ ] Implementar sistema de push notifications
- [ ] Implementar detecção de movimento
- [ ] Implementar alarmes
- [x] Criar histórico de alertas
- [x] Criar página de visualização de notificações

## Controles PTZ
- [x] Criar painel de controle PTZ
- [x] Implementar movimento direcional (cima, baixo, esquerda, direita)
- [x] Implementar zoom óptico
- [x] Implementar gerenciamento de presets
- [x] Criar interface de controle PTZ

## Dashboard Profissional
- [x] Criar página de dashboard
- [x] Implementar visão geral do sistema
- [x] Implementar status de todos os dispositivos
- [x] Implementar métricas de conectividade
- [ ] Implementar log de eventos

## Configurações do Sistema
- [x] Criar página de configurações
- [x] Implementar seção de conta do usuário
- [x] Implementar gerenciamento de dispositivos (configurações)
- [x] Implementar configurações de notificações
- [x] Implementar seleção de qualidade de vídeo
- [x] Implementar configurações de rede
- [x] Implementar preferências gerais

## Design e Estilo
- [x] Implementar dark mode com paleta cybersecurity/Hikvision
- [x] Configurar cores (azul, ciano, escuro)
- [ ] Implementar componentes estilizados
- [ ] Implementar responsividade mobile
- [ ] Implementar ícones e visual profissional

## Testes e Finalização
- [ ] Testar autenticação
- [ ] Testar gerenciamento de dispositivos
- [ ] Testar Live View
- [ ] Testar Playback
- [ ] Testar favoritos
- [ ] Testar notificações
- [ ] Testar controles PTZ
- [ ] Testar dashboard
- [ ] Testar configurações
- [ ] Criar checkpoint final
