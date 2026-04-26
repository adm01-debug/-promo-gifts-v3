## Objetivo

Garantir que o **vendedor** (papel "agente") só visualize e gerencie **suas próprias** propostas, clientes vinculados, pedidos, itens e solicitações de desconto. **Supervisor** vê o time (mesma organização). **Admin/manager/dev** veem tudo. Isolamento aplicado no banco (RLS) e refletido nos filtros de UI/queries.

## Diagnóstico do estado atual

| Tabela | Coluna de dono | Policy hoje | Problema |
|---|---|---|---|
| `quotes` | `seller_id` | OK (seller próprio + manager) | Falta clausula `WITH CHECK` em INSERT/UPDATE |
| `quote_items` / `quote_history` / `quote_item_personalizations` | via `quote_id` | OK (herdado de quotes) | OK |
| `quote_comments` | `user_id` + via quote | OK | Sem `WITH CHECK` em INSERT |
| `quote_templates` | `seller_id` | OK | Falta `WITH CHECK` |
| `quote_approval_tokens` | `seller_id` | OK | Falta `WITH CHECK` |
| `orders` | `seller_id` + `organization_id` | OK | Falta `WITH CHECK` |
| `order_items` | `organization_id` + via order | OK | INSERT sem `WITH CHECK` |
| `discount_approval_requests` | `seller_id` | **3 policies SELECT redundantes**, 2 INSERT vazios, supervisor é `can_approve_discount` (= manager/admin/supervisor) | Limpar duplicatas e exigir `seller_id = auth.uid()` no INSERT |
| `seller_discount_limits` | `user_id` | Vendedor lê o seu, supervisor gerencia | OK |
| `seller_carts` / `seller_cart_items` | `seller_id` | (auditar) | Conferir |

**Não existe** tabela `clients` separada — clientes estão embutidos em `quotes`/`orders` (campos `client_*`). O isolamento por cliente sai automaticamente do isolamento de quote/order.

**Hierarquia já modelada**: `is_admin_strict` (admin), `can_manage_quotes` (supervisor/manager/admin), `get_user_org_ids` (escopo de time via organização).

## Mudanças (migração SQL)

### 1. Helpers consolidados

```sql
-- Helper explícito para "é vendedor" (apenas vendedor, sem privilégio extra)
CREATE OR REPLACE FUNCTION public.is_seller_only(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT has_role(_user_id,'vendedor')
     AND NOT can_manage_quotes(_user_id)
     AND NOT is_admin_strict(_user_id)
$$;

-- Helper "vê tudo" (admin/manager/dev)
CREATE OR REPLACE FUNCTION public.can_view_all_sales(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT is_admin_strict(_user_id)
      OR has_role(_user_id,'manager')
      OR has_role(_user_id,'dev')
$$;
```

### 2. Reescrita de policies (padrão por tabela)

Para cada tabela com `seller_id`:
- **SELECT**: `can_view_all_sales() OR (has_role(auth.uid(),'supervisor') AND organization_id IN get_user_org_ids(auth.uid())) OR seller_id = auth.uid()`
- **INSERT** (`WITH CHECK`): `seller_id = auth.uid() OR can_view_all_sales()`
- **UPDATE/DELETE**: `seller_id = auth.uid() OR can_view_all_sales() OR (supervisor AND mesma org)`

Aplicado em: `quotes`, `orders`, `quote_templates`, `quote_approval_tokens`, `discount_approval_requests`, `seller_carts`, `seller_cart_items`.

Para tabelas-filhas (`quote_items`, `order_items`, `quote_history`, `quote_comments`, `quote_item_personalizations`): manter padrão `EXISTS (parent WHERE owner check)` mas adicionar **WITH CHECK** simétrico no INSERT/UPDATE.

### 3. Limpeza de policies duplicadas em `discount_approval_requests`

Drop de:
- `Sellers can create approval requests` (sem WITH CHECK)
- `Sellers can read own approval requests` (duplicada)

Recriar como bloco único: vendedor vê/cria os seus, supervisor (mesma org) gerencia, admin tudo.

### 4. Trigger de auto-preenchimento

```sql
CREATE OR REPLACE FUNCTION public.set_seller_id_default()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.seller_id IS NULL THEN NEW.seller_id := auth.uid(); END IF;
  RETURN NEW;
END $$;
```
Aplicado em INSERT de `quotes`, `orders`, `quote_templates`, `quote_approval_tokens`, `discount_approval_requests`.

## Mudanças no frontend

Como RLS já filtra no banco, queries existentes continuam corretas — porém precisam **deixar de tentar filtrar manualmente** quando o usuário é admin/supervisor (caso contrário não verão dados de outros). Auditar:

- `src/hooks/useQuotes.ts`, `src/hooks/useOrders.ts`, `src/hooks/useDiscountApprovals.ts` (e equivalentes)
- Remover `.eq('seller_id', user.id)` em queries quando o role permitir ver mais (delegar ao RLS)
- Adicionar **badge "Apenas seus dados"** no header das listas quando `is_seller_only` for true (já temos hook `useUserRole`)
- Garantir que combos de "atribuir vendedor" só apareçam para supervisor/admin

Arquivos previstos:
- `src/lib/auth/visibility-scope.ts` (novo) — helper client `getSalesScope()` retornando `'self' | 'team' | 'all'`
- Ajustes em hooks de listagem (≤6 arquivos)
- `src/components/common/ScopeBadge.tsx` (novo)

## Verificação pós-migração

1. **Testes SQL** com `SET request.jwt.claim.sub` simulando 3 usuários (vendedor A, vendedor B, supervisor, admin) sobre cada tabela.
2. **Painel de Diagnóstico** existente (`FullOpDiagnosticsPanel`) ganha aba "Visibilidade" mostrando contagem de registros visíveis por escopo.
3. Linter Supabase deve continuar 0 issues.
4. Smoke no preview: login como vendedor → /orcamentos só mostra dele; /pedidos idem; /descontos idem.

## Rollback

Migração reversível: cada `DROP POLICY ... CREATE POLICY` em bloco transacional. Caso problema, recriar policies anteriores a partir do snapshot SQL incluído no comentário do arquivo de migração.

## Fora de escopo

- Não cria papel novo `agente` (papel existente `vendedor` é o agente).
- Não cria tabela `clients` separada (clientes seguem embutidos).
- Não altera `seller_carts` schema, apenas policies.
