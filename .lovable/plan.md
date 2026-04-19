
Faltam 2 itens da entrega anterior do Connections Hub: rota + sidebar. Plano mínimo e cirúrgico para fechar.

# Plano: Finalizar Connections Hub (2 itens)

## 1. Registrar rota `/admin/conexoes`
Em `src/App.tsx`, adicionar import lazy de `AdminConexoesPage` e a rota dentro do bloco `AdminRoute`, ao lado das demais rotas admin (ex: `/admin/seguranca-acesso`).

## 2. Adicionar item "Conexões" na sidebar admin
Em `src/components/layout/SidebarReorganized.tsx` (ou equivalente em uso), incluir entrada com ícone `Plug` (lucide-react), label "Conexões", path `/admin/conexoes`, posicionado logo após "Acesso & Bots" no grupo Admin.

## 3. Salvar memória `mem://integrations/connections-hub`
Documentar: rota, 5 abas, edge functions (`secrets-manager`, `connection-tester`, `webhook-dispatcher`, `webhook-inbound`, `mcp-server`), tabelas (`external_connections`, `outbound_webhooks`, `webhook_deliveries`, `inbound_webhook_endpoints`, `inbound_webhook_events`, `mcp_api_keys`), eventos suportados e padrão HMAC-SHA256. Atualizar `mem://index.md` com referência.

## Arquivos
- **Modificados**: `src/App.tsx`, `src/components/layout/SidebarReorganized.tsx` (confirmar nome real ao executar), `.lovable/memory/index.md`.
- **Novos**: `.lovable/memory/integrations/connections-hub.md`.

Após aprovação, executo na ordem: localizar sidebar real → editar App.tsx → editar sidebar → salvar memória.
