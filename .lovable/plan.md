
Estou em modo plan (read-only). Ondas 1-2 já concluídas (8/16). Preciso apresentar plano para Ondas 3-5 (8 melhorias restantes) para o usuário aprovar e eu executar em modo default.

## Roadmap final — Ondas 3 a 5 (8 melhorias restantes)

### Onda 3 — Performance
**9. Debounce de 300ms nos filtros** — `IntelligenceFilterBar.tsx`: aplicar `useDebouncedCallback` no `onFiltersChange` para evitar refetch em cascata ao trocar categoria/fornecedor/produto rapidamente.

**10. Virtualização de listas longas** — `CategoryRanking.tsx` e `SupplierSales.tsx`: usar `@tanstack/react-virtual` quando lista > 50 itens (padrão já adotado no projeto conforme `mem://architecture/performance-virtualization-standards`).

### Onda 4 — Observabilidade & Telemetria
**11. Telemetria de regenerações no card de Insights** — `MarketIntelligenceInsightsCard.tsx`: ao clicar "Regenerar", inserir evento em `ai_usage_events` (`event_type: 'manual_regenerate'`, metadata = filtros ativos). Tabela já existe.

**12. Painel admin "Uso de IA — Inteligência de Mercado"** — adicionar seção em `/admin/monitoramento-ia` (ou rota equivalente) consumindo `ai_usage_events` filtrado por `function_name = 'market-intelligence-insights'`: total regenerações por dia, top usuários, % cache hit vs miss. Componente novo `MarketIntelInsightsUsagePanel.tsx`.

**13. Job de limpeza de cache expirado** — pg_cron diário que apaga `ai_insights_cache WHERE expires_at < now()` (mantém tabela enxuta).

### Onda 5 — Polimento Final
**14. Empty states ilustrados** — `TrendingProducts`, `CategoryRanking`, `SupplierSales`: quando filtro retorna 0 resultados, mostrar ilustração SVG inline + CTA "Limpar filtros" em vez de lista vazia silenciosa.

**15. Tooltip explicativo no botão "Regenerar"** do card de Insights — informar que custo de IA será consumido e que cache vale 6h, evitando regenerações acidentais.

**16. Documentação consolidada** — atualizar `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` (seção Inteligência de Mercado) descrevendo: KPIs, Insights de IA com cache, telemetria, filtros sticky, refresh global. Atualizar `mem://infrastructure/hardening-roadmap.md` marcando as 16 melhorias como concluídas.

### Execução
- Sequencial, sem pausas, sem perguntas
- Após cada onda: relatório curto inline
- Ao final: resumo consolidado das 16 melhorias + screenshots mentais do que mudou

### Não tocar
- Mocks de `/tendencias`
- `types.ts`, `client.ts`, `.env`
- Edge functions de outros módulos
- Hooks SSOT do catálogo
