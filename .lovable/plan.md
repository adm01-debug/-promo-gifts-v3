
# Excluir "Performance Comercial" (/performance)

Será removido outro sistema fará o papel. **Mantém** `/admin/performance` (Web Vitals — feature distinta).

## O que será removido

**Frontend / Backend de aplicação:**
- `src/pages/SellerPerformanceDashboard.tsx` — deletar arquivo
- `src/hooks/useSellerPerformance.ts` — deletar arquivo (era o "backend" — só agregava `quotes`/`orders` no client; nenhuma tabela ou edge function dedicada existe, nada a remover no Supabase)

**Roteamento / navegação:**
- `src/App.tsx` — remover `import SellerPerformanceDashboard` (linha 95) e `<Route path="/performance" …>` (linha 238)
- `src/components/layout/SidebarReorganized.tsx` — remover item `{ icon: Star, label: "Performance", href: "/performance" }` (linha 118)

**Documentação:**
- Buscas em `docs/` e `.lovable/memory/` mostraram que **não existe** menção ao módulo "Performance Comercial / SellerPerformance". As únicas ocorrências de "performance" em docs/memória são sobre `/admin/performance` (Web Vitals runtime), que permanece. Logo, **nenhuma alteração em documentação é necessária**.

## Resumo de arquivos
- **Excluir:** `src/pages/SellerPerformanceDashboard.tsx`, `src/hooks/useSellerPerformance.ts`
- **Editar:** `src/App.tsx`, `src/components/layout/SidebarReorganized.tsx`

Sem migrações de schema, sem edge functions a deletar.
