# Plano: Otimização Performance BD ↔ Front (Rumo ao 10/10)

## Contexto
Diagnóstico anterior provou: BD está saudável (queries 51–323ms), edge functions OK em steady-state. Os ofensores reais são:
1. **Cold-start em rajada** do `external-db-bridge` (pico 3s quando 6+ requests chegam frias juntas)
2. **Bundle não otimizado** em prod (Sentry 186KB, lucide-react 136KB, sem manual chunks calibrados)

Vou executar **4 ondas**, da maior para menor impacto, validando cada uma antes de prosseguir.

---

## Onda 1 — Prewarm agressivo do external-db-bridge no login
**Impacto:** elimina pico de 3s na primeira ação do dia.

**O que fazer:**
- Ler `src/lib/external-db-prewarm.ts` (já existe) e o fluxo do `AuthContext`
- Disparar 1 ping `noop` (operação leve) ao `external-db-bridge` imediatamente após `isAuthenticated = true`, em paralelo com o prefetch do catálogo
- Adicionar 2º ping ao `crm-db-bridge` (mesma latência de cold-start)
- Garantir idempotência: 1x por sessão via `sessionStorage`
- Tratar falhas silenciosamente (não bloqueia UI)

**Critério de excelência:**
- Logs do `external-db-bridge` mostram `booted` no T+0 do login (não na primeira ação)
- Nenhum erro novo em console
- Teste unitário cobrindo "não dispara 2x na mesma sessão"

---

## Onda 2 — Manual chunks calibrados no Vite
**Impacto:** reduz FCP em produção em ~30% e melhora cache hit em deploys.

**O que fazer:**
- Ler `vite.config.ts` atual
- Adicionar `build.rollupOptions.output.manualChunks` separando:
  - `react-vendor` (react, react-dom, react-router-dom)
  - `ui-radix` (todos `@radix-ui/*`)
  - `charts` (recharts)
  - `motion` (framer-motion)
  - `supabase` (@supabase/supabase-js)
  - `query` (@tanstack/react-query)
  - `forms` (react-hook-form, zod)
  - `dates` (date-fns)
- Garantir que `lucide-react` continue tree-shakeable (não criar chunk único)
- Validar com `bun run build` que não há circular deps

**Critério de excelência:**
- `dist/assets/` tem chunks separados ≤ 200KB cada
- Build passa sem warnings de chunk-size > 500KB
- Tipos TypeScript intactos

---

## Onda 3 — Lazy load do Sentry (186KB)
**Impacto:** -200ms no FCP inicial.

**O que fazer:**
- Ler `src/lib/sentry.ts` e onde é importado
- Converter `import * as Sentry from '@sentry/react'` em `import()` dinâmico
- Inicializar Sentry após `requestIdleCallback` ou após 3s de delay
- Manter `ErrorBoundary` funcional via fallback nativo até Sentry carregar
- Buffer de erros antes da inicialização → flush quando carregar

**Critério de excelência:**
- Sentry **não aparece** no chunk inicial (verificar via `bun run build` + grep)
- Erros disparados antes do load são capturados quando Sentry inicializa
- Reportagem manual (`captureException`) ainda funciona com fila

---

## Onda 4 — Lazy icons + cleanup de barrel imports
**Impacto:** -100ms FCP, bundle inicial mais magro.

**O que fazer:**
- Identificar componentes do *first paint* que importam `lucide-react` em massa (Header, Sidebar)
- Manter `lucide-react` mas garantir que componentes lazy-loaded **não** subam ícones para o chunk principal
- Auditar `MainLayout` para confirmar que ícones de rotas secundárias estão em chunks lazy
- Remover imports não utilizados via ESLint `no-unused-imports` se já configurado, senão executar verificação manual

**Critério de excelência:**
- Chunk inicial < 250KB
- Re-rodar `browser--performance_profile` em `/admin/telemetria` mostrando FCP < 3s no preview-dev
- Zero import quebrado (typecheck passa)

---

## Validação Final
Após as 4 ondas:
1. `bun run build` limpo, sem warnings
2. Suite de testes existente (41 testes prévios + novos) 100% verde
3. `browser--performance_profile` na rota `/admin/telemetria` comparando antes/depois
4. Logs do `external-db-bridge` confirmando prewarm efetivo
5. Resumo executivo das melhorias com métricas reais

---

## Detalhes técnicos

**Arquivos que vou ler/criar/editar:**
- `src/lib/external-db-prewarm.ts` (editar)
- `src/contexts/AuthContext.tsx` (editar — gatilho do prewarm)
- `src/lib/sentry.ts` (refatorar para lazy)
- `src/main.tsx` ou `src/App.tsx` (gatilho lazy do Sentry)
- `vite.config.ts` (manualChunks)
- `tests/` (1 teste novo para idempotência do prewarm)

**Nada toca:**
- Schema do BD
- Edge functions existentes
- RLS policies
- Design system / tokens

Aprove para eu começar pela Onda 1 e seguir ininterruptamente até a Onda 4.