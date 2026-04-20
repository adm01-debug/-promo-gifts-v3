

# QA Abrangente — Comparador 10/10 (Ondas C1→C6)

Plano de testes end-to-end **somente** sobre o que foi implementado nas ondas C1→C6 do Comparador. Vou executar via browser automation + queries no banco + curl nas edge functions + leitura de logs.

## Escopo (34 itens implementados)

**Ondas C1-C5 (26):** score, radar, TCO, highlight expandido, differences toggle, IA advisor, CRM picker, criar orçamento, share público + reactions, export PDF/PNG/CSV, sync cross-device, duel view, sync variantes, mobile carousel, sticky header, hover preview, animações, sparkline 30d, fornecedores alternativos, risco estoque, similar rail, presentation, atalhos globais, ARIA-live, empty state inteligente, recents sidebar.

**Onda C6 (8):** pesos personalizáveis, histórico 30d overlay, PDF white-label, drag-reorder colunas, focus mode (F), zoom inline, price watcher cron, cheatsheet (Shift+?).

## Etapa 1 — QA Backend (queries + curl)

| Teste | Como |
|---|---|
| Tabelas `user_comparisons`, `comparison_reactions`, `user_preferences` existem com RLS | `supabase--read_query` em `pg_policies` |
| RPCs `cleanup_expired_public_comparisons`, `get_top_compared_products`, `get_user_recent_comparisons` retornam shape correto | `supabase--read_query` chamando cada RPC |
| Crons `cleanup-expired-public-comparisons` (03:30) e `comparison-price-watcher` (04:00) ativos | `SELECT * FROM cron.job` |
| Edge function `comparison-ai-advisor` responde com produtos mock | `supabase--curl_edge_functions` |
| Edge function `comparisons-public-react` aplica rate limit (5/min/IP) | curl 6× rápido, esperar 429 na 6ª |
| Edge function `comparison-price-watcher` executa sem erro | curl manual + `supabase--edge_function_logs` |

## Etapa 2 — QA Frontend (browser automation)

**Setup:** `navigate_to_sandbox` em `/produtos`, adicionar 3 produtos via botão "Comparar".

| Cenário | Verificação |
|---|---|
| Navegar `/comparar` com 3 produtos | Carrega sem erro, score badge "Recomendado" visível |
| Toggle "Differences only" | Linhas idênticas somem |
| Abrir radar chart (R) | Modal abre, 5 eixos renderizam |
| Botão "Análise IA" | Loading → 3 bullets de recomendação |
| Pesos popover (sliders) | Mover preço para 50% recalcula score |
| `FavoritesClientPicker` no header | Selecionar cliente, persiste |
| "Criar orçamento" | Navega `/orcamentos/novo?products=...&client_id=...` |
| Compartilhar (gera token) | Copia URL `/comparar-publica/:token` |
| Abrir share em aba anônima | Página pública carrega read-only |
| Reagir 👍 na pública | Insere em `comparison_reactions` |
| Export PDF white-label | Baixa PDF com logo/cor do cliente |
| Export PNG e CSV | Ambos baixam com conteúdo válido |
| Remover 1 produto (ficar com 2) | Auto-renderiza `ComparisonDuelView` |
| Drag-reorder coluna | Ordem persiste em `user_preferences` |
| Hover swatch de cor | Imagem do header troca |
| Hover célula imagem | Zoom 2× inline |
| Atalho `F` | Focus mode esconde sidebar/header |
| Atalho `Shift+?` | Cheatsheet abre com lista de atalhos |
| Atalho `Shift+X` | Limpa, ARIA-live anuncia |
| Atalho `1`-`4` | Foca produto N |
| Empty state (0 produtos) | Mostra top 6 da semana + CTA |
| `RecentComparisonsSidebar` | Últimas 5 recarregam em 1 clique |
| Mobile (375×812) | `ComparisonMobileView` ativa, carousel vertical |

## Etapa 3 — QA Resiliência

- Token expirado em share público → erro tratado
- Sem produtos com `price_history` → sparkline cai gracioso
- IA advisor sem cota → mensagem amigável (não crash)
- Drag-reorder com 1 produto → desabilitado
- Logout durante comparação → localStorage permanece

## Etapa 4 — Relatório final

Tabela com **PASS / FAIL / N/A** para cada um dos 34 itens, screenshots dos pontos críticos (radar, duel, mobile, focus mode, cheatsheet, share público), lista de bugs encontrados (se houver) e severidade.

Se encontrar bugs, **PARO** o teste, reporto, e aguardo aprovação para fix.

## Resultado esperado

Certificação independente de que o Comparador está 10/10 funcional end-to-end, ou lista priorizada de correções pré-go-live.

