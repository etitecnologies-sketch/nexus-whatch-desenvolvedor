# Design de Páginas — Dashboard VMS Web (desktop-first)

## Padrões globais (todas as páginas)

### Layout
- Estrutura base: grid 12 colunas (CSS Grid) com áreas fixas (Topbar) e conteúdo variável.
- Conteúdo principal: container fluido (max-width sugerido: 1440–1600px) e “full-width” quando em modo monitoramento.
- Responsividade:
  - Desktop (>=1280): navegação lateral recolhível + grid denso.
  - Tablet (768–1279): lateral vira drawer; grids reduzem colunas.
  - Mobile (<768): foco em lista/detalhe e 1 vídeo por vez (sem mosaico denso).

### Meta Information
- Title base: "VMS Dashboard"
- Description: "Dashboard web para monitoramento e investigação de vídeo"
- Open Graph:
  - og:title: "VMS Dashboard"
  - og:description: "Monitoramento ao vivo, playback e eventos"
  - og:type: "website"

### Global Styles (design tokens)
- Cores:
  - Background: #0B1220 (dark) e superfícies #101A2F / #111827
  - Texto primário: #E5E7EB; secundário: #9CA3AF
  - Accent/Primary: #3B82F6 (ações)
  - Sucesso: #22C55E; Atenção: #F59E0B; Crítico: #EF4444; Info: #38BDF8
- Tipografia:
  - Base: 14px; Headings: 18/20/24px (sem exagero para caber muita informação)
  - Fonte: system-ui/Inter (se disponível)
- Botões:
  - Primary: fundo accent, hover +8% brilho, disabled 50% opacity
  - Secondary: outline, hover com fundo sutil
- Links:
  - Cor accent, underline on hover
- Estados:
  - Focus visível (outline 2px accent)
  - Skeleton loading para tiles de câmera e tabelas

### Componentes compartilhados
- Topbar: logo + seletor de unidade (se aplicável) + busca global + ícone de notificações + menu do usuário.
- Sidebar (desktop): itens principais (Dashboard, Monitoramento, Eventos, Administração), com badges (eventos abertos/críticos).
- Toasts: feedback curto (ex.: “Evento reconhecido”).
- Modais/Drawers: detalhe de evento, escolha de câmera, salvar layout.

---

## 1) Página: Login

### Layout
- Flexbox centralizado; card fixo (max 420px), com branding discreto.

### Page Structure
- Fundo com gradiente sutil escuro + card.

### Sections & Components
- Card de login:
  - Título: “Entrar”
  - Campos: e-mail, senha
  - Ação: botão “Entrar”
  - Link: “Esqueci minha senha”
- Recuperação (modal ou rota dentro da mesma página):
  - Campo e-mail + botão “Enviar link”
- Estados:
  - Erro de credenciais (inline)
  - Loading no botão

---

## 2) Página: Dashboard (Visão Geral)

### Layout
- CSS Grid (2 colunas): esquerda (KPIs + avisos), direita (eventos recentes + atalhos).
- Cards com densidade alta para operação.

### Page Structure
- Header da página: título + filtros rápidos (Unidade/Local, Período “Agora”).
- Corpo com cards:

### Sections & Components
- Card “Saúde do Sistema”
  - Contadores: online/offline/degraded
  - Lista curta (top 5) de câmeras com problema (nome + status + ação “Abrir no Monitoramento”)
- Card “Eventos Críticos”
  - Lista dos eventos críticos abertos (timestamp, câmera, título)
  - Ações rápidas: “Reconhecer” (se permitido), “Abrir detalhes”
- Card “Atalhos”
  - Botões: “Abrir layout favorito”, “Retomar última sessão”, “Ir para Eventos”
- Card “Layouts”
  - Lista: favoritos/recentes
  - Ação: “Novo layout” (abre modal)

---

## 3) Página: Monitoramento (Ao vivo + Playback)

### Layout
- Modo padrão: split view (CSS Grid)
  - Área principal: mosaico (70–80%)
  - Painel lateral: lista de câmeras + filtros + tabs (Ao vivo / Playback / Bookmarks)
- Modo foco: 1 câmera grande + timeline abaixo

### Page Structure
- Barra superior interna (dentro do conteúdo):
  - Seletor de layout + botões: Salvar, Salvar como, Compartilhar (se permitido)
  - Controle de grid: 1x1, 2x2, 3x3, 4x4 (e “custom”)
- Área de mosaico:
  - Tiles de câmera (card de vídeo) com overlay: nome, status, ícones (som, fullscreen)

### Sections & Components
- Painel “Câmeras” (lateral)
  - Busca por nome/tag
  - Filtros por local/grupo
  - Lista com status (bolinha online/offline/degraded)
  - Interação: arrastar para um tile ou clicar para substituir tile selecionado
- Tile de Câmera (comportamento)
  - Loading skeleton
  - Erro de stream: mensagem curta + ação “Tentar novamente”
  - Hover: revela controles
- Aba “Playback”
  - Seleção de intervalo (data/hora início/fim)
  - Timeline (scrubber) com marcadores de eventos
  - Controles: play/pause, velocidade, avançar/voltar 10s
  - Ação: “Criar bookmark” (abre modal com anotação)
- Aba “Bookmarks”
  - Lista (timestamp + nota + câmera)
  - Ação: “Abrir no playback”

---

## 4) Página: Eventos & Alarmes

### Layout
- Padrão master-detail (CSS Grid)
  - Esquerda: tabela/lista (40%)
  - Direita: detalhe do evento (60%)

### Page Structure
- Header: título + filtros + busca
- Corpo: lista + detalhe

### Sections & Components
- Barra de filtros
  - Severidade (chips), Status (open/ack/closed), Período
  - Filtro por câmera/grupo
- Lista de eventos
  - Linhas densas com: severidade (badge), timestamp, câmera, título
  - Ordenação padrão: severidade desc + mais recente
  - Atualização em tempo real (sem “piscadas”: usar inserção suave)
- Painel de detalhe do evento
  - Cabeçalho: severidade + status + câmera + timestamps
  - Mini player do trecho (quando disponível) e botão “Abrir no Monitoramento”
  - Ações: Reconhecer, Encerrar, Adicionar comentário
  - Auditoria: timeline de ações (quem fez o quê e quando)

---

## 5) Página: Administração

### Layout
- Layout de configurações com navegação secundária (tabs laterais) + conteúdo à direita.

### Page Structure
- Tabs: Câmeras, Grupos, Usuários, Preferências

### Sections & Components
- Tab “Câmeras”
  - Tabela com: nome, local, status, grupo, stream_url (ocultar/mostrar)
  - Ações: Criar, Editar, Desativar
  - Form (modal/drawer): nome, local, grupo, stream_url
- Tab “Grupos”
  - Lista de grupos + painel de membros
  - Ações: criar/renomear, adicionar/remover câmeras
- Tab “Usuários”
  - Lista: e-mail, nome, papel
  - Ações: convidar/criar, alterar papel, desativar
  - Permissões por grupo/câmera (mínimo viável): seletor de grupos permitidos
- Tab “Preferências”
  - Timezone padrão
  - Grid default (ex.: 2x2)
  - Comportamentos: auto-reconectar stream (on/off)

---

## Interações e microcomportamentos (essenciais)
- Navegação rápida:
  - Atalho no tile (duplo clique) para fullscreen.
  - Atalho na lista de eventos: Enter abre detalhes.
- Segurança de operação:
  - Confirmação ao encerrar evento (somente se crítico).
- Performance percebida:
  - Virtualização em listas longas (câmeras/eventos).
  - Preload de metadados (nome/status) antes de abrir streams.
