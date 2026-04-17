
Tarefa: bateria exaustiva de QA + correção de gaps em todo o sistema antes de produção. Sou READ-ONLY agora — exploro, mapeio falhas, e apresento plano de execução para aprovação.

## Estratégia de QA — 6 fases

### Fase 1 — Inventário & Health Check (auditoria fria)
- **Lint Supabase** (`supabase--linter`): RLS faltando, policies permissivas, indexes ausentes, search_path mutável.
- **Security scan** (`security--run_security_scan` + `security--get_scan_results`): findings ativos.
- **DB inspect** (`supabase--read_query`): contagem de tabelas órfãs, RPCs sem `SET search_path = public`, triggers quebrados, jobs `pg_cron` falhando (`cron.job_run_details` últimas 24h).
- **Edge functions audit** (`supabase--analytics_query`): top 20 funções por erro 5xx nas últimas 24h, latência p95, taxa de timeout.
- **Console/network do preview**: erros JS, requests 4xx/5xx, race conditions visíveis.
- **TypeScript**: rodar `tsc --noEmit` (via exec na fase 2) para pegar erros silenciosos.

### Fase 2 — Smoke tests automatizados (60+ cenários)
Testar via `supabase--curl_edge_functions` cada edge function crítica com 3 payloads: válido, inválido (Zod), não-autenticado.
- **Auth-gated** (~30 funções): `crm-db-bridge`, `external-db-bridge`, `magic-up-*`, `ai-recommendations`, `quote-*`, `semantic-search`, `trends-insights`, `process-queue`, `detect-stalled-quotes`.
- **Públicas** (~5): `quote-public-view`, `image-proxy`, `get-visitor-info`.
- **Webhooks/cron**: validar `pg_cron` jobs (limpeza notificações, stalled quotes, refresh MVs).

### Fase 3 — Fluxos E2E críticos (browser, 8 jornadas)
1. Login + redirect.
2. Catálogo: filtros (cor/categoria/preço), busca, paginação infinita, comparar.
3. Carrinho: adicionar variante, sugestão de bundle, remover, salvar template.
4. Quote Builder: 4 etapas, desconto + alçada, margem badge, gerar PDF, enviar.
5. Quote público: visualizar token, assinatura eletrônica, aprovar.
6. Pedidos: conversão de quote, edição.
7. Magic Up: gerar mockup com logo, salvar, regenerar.
8. Trends: filtros URL, comparação temporal, export CSV/PDF.
9. **Ctrl+K**: busca semântica nas 15 entidades, atalhos 1-9, empty state, cache.
10. Notificações: stalled quote, polling 30s, mark as read.

### Fase 4 — Edge cases & fuzzing
- Inputs malformados (SQL injection, XSS, payloads gigantes, UTF-8 bizarro).
- Rate limiting (`bot-protection`): simular 100 req/min em endpoint público.
- RLS bypass attempts: tentar SELECT/INSERT em tabela alheia com user comum.
- Privilege escalation: vendedor tentando acessar `/admin/*`.
- Race conditions: 2 abas simultâneas editando mesmo orçamento.
- Offline/timeout: external-db-bridge com `EXTERNAL_SUPABASE_URL` ausente (já visto nos logs!).
- Imagens quebradas, vídeos sem `cloudflare_status=ready`.
- Quotes com 0 itens, com 500 itens, com desconto >100%.

### Fase 5 — Correções (priorizado por severidade)
**P0 (blocker prod):**
- `external-db-bridge`: `EXTERNAL_SUPABASE_URL/KEY not configured` aparecendo em massa nos logs → verificar secrets + fallback gracioso.
- `ProductCardSkeleton`: warning "Function components cannot be given refs" → adicionar `forwardRef`.
- Qualquer RLS missing/policy permissiva achada na Fase 1.
- Edge functions sem JWT validation que expõem dados sensíveis.

**P1 (alto):**
- search_path mutável em RPCs (já há padrão `SET search_path = public`).
- Edge functions com erro 5xx recorrente.
- Memory leaks / unbounded queries.

**P2 (médio):**
- Acessibilidade (aria-labels, roles).
- Performance (queries N+1, falta de index).
- UX gaps (loading states, error boundaries).

### Fase 6 — Validação final
- Re-rodar lint + security scan → 0 erros críticos.
- Smoke tests 100% green.
- Browser E2E nas 10 jornadas → screenshot de cada.
- Atualizar `mem://architecture/operational-resilience-and-disaster-recovery` com checklist de produção.
- Criar `docs/PRODUCTION_READINESS_REPORT.md` com tudo que foi testado/corrigido.

## Escopo realista (1 sessão)
Tentar "milhares de testes" literais é inviável; faço **bateria estruturada de ~150 verificações automatizadas + 10 jornadas E2E + correção de todos os P0/P1 encontrados**. Se sobrarem P2, listo no relatório com plano de follow-up.

## Sem novos arquivos por enquanto
Tudo em fase de auditoria. Correções específicas só serão escritas após Fase 1+2 revelarem o backlog real. Migrations só se RLS/index faltando.

## Confirmação implícita
Memória `.lovable/user-preferences` autoriza execução autônoma sequencial. Ao aprovar, executo Fases 1→6 sem pausas, reportando ao final com relatório consolidado e screenshots.
