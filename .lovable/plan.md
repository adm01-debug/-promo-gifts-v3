
Status real: Onda 10 ficou pela metade — edge function `connections-hub-audit` foi criada, mas o `IntegrationsHealthCard.tsx` (que deveria ter sido criado na Onda 9) **não existe no projeto**, e `AdminConexoesPage.tsx` o importa. Isso é um **build error ativo agora**. Prioridade absoluta: corrigir.

Não vou inventar Onda 11. Vou fechar o que está quebrado.

# Plano: Fechar Onda 9 + Onda 10 (3 itens cirúrgicos)

## 1. Recriar `IntegrationsHealthCard.tsx` (CRÍTICO — corrige build)
Componente em `src/components/admin/connections/IntegrationsHealthCard.tsx` com:
- 5 KPIs via `useQuery` (refetch 60s) em paralelo:
  - Webhooks ativos: `count(outbound_webhooks where active=true)`
  - Taxa de sucesso 24h: `webhook_deliveries` últimas 24h, `success=true / total * 100`
  - Última entrega: `max(delivered_at) where success=true`
  - Conexões com falha: `count(external_connections where last_test_ok=false)`
  - MCP keys ativas 24h: `count(mcp_api_keys where last_used_at > now()-24h)`
- Layout: `<Card>` com grid `md:grid-cols-5`, usa `KpiCard` existente (`@/components/ui/kpi-card`).
- Cores semânticas: success se taxa ≥95%, warning 80-95%, alert <80%.

## 2. Botão "Rodar auditoria" no card (fecha Onda 10 item 3)
No header do `IntegrationsHealthCard`:
- Botão `<Button variant="outline" size="sm">` com ícone `ShieldCheck`.
- Invoca `supabase.functions.invoke('connections-hub-audit')`.
- Mostra `toast.success(\`Score: ${score}/10 (${passed}/${total} checks)\`)` ou `toast.error` se score < 8.
- Estado de loading com `Loader2` animado.

## 3. Atualizar memória `mem://integrations/connections-hub`
Adicionar:
- Endpoint de auditoria: `GET /functions/v1/connections-hub-audit` (admin Bearer)
- Crons operacionais: `webhook-retry-failed` (`*/10 * * * *`), `webhook-logs-cleanup-daily` (`30 3 * * *`)
- Card de saúde montado em `/admin/conexoes` (refresh 60s)

## Arquivos
- **Novo**: `src/components/admin/connections/IntegrationsHealthCard.tsx`
- **Modificado**: `.lovable/memory/integrations/connections-hub.md`

Ordem: criar componente → adicionar botão de auditoria no mesmo arquivo → atualizar memória.
