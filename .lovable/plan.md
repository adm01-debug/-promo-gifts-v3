
Margem de Negociação já entregue. Próximo vetor 10/10: **fechar o loop da feature** garantindo que markup nunca vaze ao cliente, esteja visível ao admin aprovador e seja auditado.

## Sprint — Margem de Negociação: Hardening & Visibilidade

### 1. Quote pública / PDF — anti-vazamento
- Auditar `supabase/functions/quote-public-view/index.ts`: garantir que o payload retornado ao cliente **não** inclua `negotiation_markup_percent`, `real_subtotal`, `real_discount_percent`. Whitelist explícita de campos.
- Auditar gerador de PDF (`generateQuotePDF` / `quote-pdf` edge): mesma whitelist. Cliente vê apenas `subtotal` (apresentado) e `discount_percent` (aparente).

### 2. Approval workflow — admin vê os dois descontos
- Editar tela de aprovação de desconto (admin): coluna nova "Desconto Real" + tooltip "Aparente: X% / Real: Y% (markup +Z%)".
- `MarginInsightBadge`: quando markup > 0, mostrar dual badge (aparente vs real).
- `discount_approval_requests.requested_discount_percent` já é o real (vindo de `realDiscountPercent`) — confirmar no `requestApproval`.

### 3. CRM sync — payload coerente
- `bitrix-quote-sync` / `salespro-quote-sync`: enviar `subtotal` apresentado + `discount_percent` aparente (espelho do que cliente viu) + campo extra `internal_real_discount_percent` para auditoria interna no CRM.

### 4. Auditoria
- Logar em `admin_audit_log` toda criação/edição com `negotiation_markup_percent > 0` (action: `quote_negotiation_markup_applied`, metadata: markup, real_discount, apparent_discount).

### 5. Memória
- Criar `mem://features/quote-negotiation-markup` com fórmula + invariantes + lista de superfícies que NÃO devem expor markup.
- Atualizar `mem://features/quote-discount-approval-workflow` referenciando que alçada agora valida pelo desconto real.
- Atualizar `mem://index.md`.

### 6. Validação E2E
- Browser: criar quote com markup +20% e desconto aparente 25%, confirmar que link público mostra subtotal inflado + 25%, mas tela admin mostra real ~6%.
- Conferir que tentar exceder alçada real bloqueia com mensagem clara.
- Verificar PDF gerado.

## Arquivos
- **Editar:** `supabase/functions/quote-public-view/index.ts`, `supabase/functions/bitrix-quote-sync/index.ts`, `supabase/functions/salespro-quote-sync/index.ts`, `src/components/admin/DiscountApprovalsTable.tsx` (ou equivalente), `src/components/quote/MarginInsightBadge.tsx`, `src/hooks/quotes/quoteHelpers.ts` (audit log call), gerador de PDF
- **Novo:** `mem://features/quote-negotiation-markup.md`
- **Sem migration** (schema já está pronto)
