
O usuário pediu para executar autonomamente todas as melhorias até atingir 10/10 no módulo de Inteligência de Mercado. Vou estruturar um roadmap focado e executável em ondas, com foco em qualidade percebida (UX, performance, observabilidade, robustez do Insights de IA recém-criado).

## Roadmap de Excelência — Inteligência de Mercado (rumo a 10/10)

### Onda 1 — Robustez do Insights de IA (acabamos de criar)
1. **Persistência de cache server-side** — salvar último insight gerado em tabela `ai_insights_cache` (chave = hash dos filtros + dia) para evitar re-cobrança do gateway em refresh
2. **Estado vazio inteligente** — quando volume insuficiente, mostrar mensagem explicativa em vez de erro
3. **Botão "Copiar insight"** + "Exportar como nota" para compartilhar com a equipe

### Onda 2 — UX do Dashboard
4. **Skeleton unificado** dos KPI Cards (eliminar layout shift ao trocar filtros)
5. **Filtros sticky** no scroll (barra fica fixa no topo ao rolar)
6. **Indicador de "última atualização"** com botão refresh global da página
7. **Empty states ilustrados** para Top Produtos / Categorias / Fornecedores quando não há dados no filtro

### Onda 3 — Performance
8. **Debounce de 300ms** nos filtros para evitar refetch em cascata ao trocar rapidamente
9. **Prefetch** dos dados ao abrir a rota via `routePrefetch`
10. **Virtualização** das listas longas (CategoryRanking, SupplierSales) quando > 50 itens

### Onda 4 — Observabilidade & Qualidade
11. **Logging estruturado** na edge `market-intelligence-insights` (latência, tokens, fallback usado)
12. **Telemetria de uso**: tracking de quantas vezes Insights é regenerado por usuário (tabela `ai_usage_events`)
13. **Quota check** integrada ao `monitoramento-consumo-e-quotas` (bloquear se exceder limite por papel)

### Onda 5 — Polimento Final
14. **Tooltip explicativo** em cada KPI (o que significa, como é calculado)
15. **Animação fade-in escalonada** nos cards (motion delay 50ms)
16. **Documentação** atualizada em `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` descrevendo o módulo completo

### Execução
- Sequencial, 1 melhoria por vez, sem pausas
- Após cada onda, atualizar memória correspondente
- Ao final: relatório consolidado das 16 melhorias

### Não tocar
- Mocks do `/tendencias`
- Hooks SSOT do catálogo
- `types.ts`, `client.ts`, `.env`
