

# Plano: Gestão de Descontos com Aprovação — Módulo Orçamentos

## Resumo

Implementar um sistema onde o admin define o **limite máximo de desconto (%)** por vendedor. Quando um orçamento excede esse limite, ele entra em status "pendente de aprovação" e só pode ser enviado ao cliente após a aprovação do admin.

## Arquitetura

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Admin Panel     │     │  Quote Builder    │     │  Approval Queue     │
│  (Limites %)     │────▶│  (Validação)      │────▶│  (Admin aprova/     │
│  por vendedor    │     │  discount > max?  │     │   rejeita)          │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

## 1. Banco de Dados

### Tabela: `seller_discount_limits`
```sql
CREATE TABLE seller_discount_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_discount_percent NUMERIC NOT NULL DEFAULT 5,
  set_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
```
- RLS: Admin pode CRUD tudo; vendedor pode ler o próprio limite.

### Tabela: `discount_approval_requests`
```sql
CREATE TABLE discount_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  requested_discount_percent NUMERIC NOT NULL,
  max_allowed_percent NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  admin_id UUID,
  admin_notes TEXT,
  seller_notes TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: Vendedor lê/cria os próprios; Admin lê/atualiza todos.
- Validation trigger para `status IN ('pending','approved','rejected')`.

### Alteração: tabela `quotes`
- Novo status válido no trigger `validate_status_fields`: adicionar `'pending_approval'` à lista de status permitidos.

## 2. Backend (Hooks & Lógica)

### `useSellerDiscountLimits.ts`
- **Para admin**: CRUD dos limites de todos os vendedores.
- **Para vendedor**: leitura do próprio limite (`max_discount_percent`).

### `useDiscountApproval.ts`
- `requestApproval(quoteId, requestedPercent, sellerNotes)` — cria registro na fila.
- `respondToApproval(requestId, approved, adminNotes)` — admin aprova/rejeita; atualiza status do orçamento.
- `getPendingApprovals()` — lista para o admin.
- `getApprovalStatus(quoteId)` — status para o vendedor.

### Modificação em `useQuoteBuilderState.ts`
- Buscar o limite do vendedor logado ao montar.
- No momento do save: se `discountPercent > maxAllowed` → salvar com status `pending_approval` em vez de `draft` e criar automaticamente um `discount_approval_request`.
- Exibir alerta visual no builder quando o desconto excede o limite.

## 3. Interface — Admin

### Painel de Limites de Desconto (dentro de `/admin` ou `/configuracoes`)
- Tabela com todos os vendedores + limite atual + botão editar.
- Formulário inline para ajustar o `max_discount_percent` por vendedor.
- Opção de definir limite padrão para novos vendedores.

### Fila de Aprovações de Desconto
- Acessível via `/admin/aprovacoes-desconto` ou aba dedicada.
- Cards/tabela mostrando: orçamento, vendedor, cliente, desconto solicitado vs. permitido, notas.
- Botões "Aprovar" e "Rejeitar" com campo de notas.
- Ao aprovar: status do orçamento muda de `pending_approval` → `draft` (vendedor pode enviar).
- Ao rejeitar: status → `draft` + notificação ao vendedor para ajustar.

## 4. Interface — Vendedor

### No Quote Builder (coluna de resumo)
- Badge mostrando o limite autorizado: "Seu limite: até X%".
- Quando digita desconto > limite:
  - Input fica com borda amarela/warning.
  - Tooltip: "Desconto acima do autorizado (X%). Será enviado para aprovação."
  - Botão de salvar muda label: "Salvar e Solicitar Aprovação".
- Após envio, orçamento aparece com badge `Aguardando Aprovação` no Kanban e na lista.

### Notificações
- Reutilizar o sistema existente (`workspace_notifications`):
  - Admin recebe notificação quando vendedor solicita aprovação.
  - Vendedor recebe notificação quando admin aprova/rejeita.

## 5. Integração no Kanban

- Nova coluna ou badge no status `pending_approval` com cor âmbar/warning.
- Transições permitidas: `pending_approval` → `draft` (após aprovação ou rejeição).

## 6. Arquivos a Criar/Modificar

### Novos (~8 arquivos)
1. **Migration SQL** — tabelas + RLS + trigger de validação
2. `src/hooks/useSellerDiscountLimits.ts`
3. `src/hooks/useDiscountApproval.ts`
4. `src/components/admin/SellerDiscountLimitsPanel.tsx` — gestão de limites
5. `src/components/admin/DiscountApprovalQueue.tsx` — fila de aprovações
6. `src/pages/AdminDiscountApprovalsPage.tsx` — página da fila

### Modificados (~6 arquivos)
1. `src/hooks/useQuoteBuilderState.ts` — validação de limite + status
2. `src/components/quotes/QuoteBuilderSummaryColumn.tsx` — UI de warning
3. `src/components/quotes/QuoteKanbanBoard.tsx` — coluna/badge pending_approval
4. `src/pages/QuotesKanbanPage.tsx` — legenda atualizada
5. `src/App.tsx` — rota admin
6. `src/components/layout/SidebarReorganized.tsx` — menu admin (se necessário)

## 7. Segurança
- Apenas admins podem alterar limites e responder aprovações (RLS + `has_role`).
- Vendedores nunca podem auto-aprovar descontos acima do limite.
- O status `pending_approval` impede o envio do orçamento ao cliente até aprovação.

