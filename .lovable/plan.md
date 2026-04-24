

# Configuração do limite de alerta (30/60/90 dias) por produto

A infraestrutura de leitura (`priceFreshnessThresholdDays` no `Product` + util `getPriceFreshness` com fallback de 60d + badges em todos os pontos da UI) **já está implementada**. Falta a interface administrativa para o vendedor/admin **configurar** o `price_freshness_threshold_days` por produto, com escolha entre os presets 30/60/90 e fallback automático para 60d quando o produto não tiver valor explícito.

## 1. Confirmar coluna no BD externo

Antes de qualquer UI, conferir via `supabase--read_query` (ou consulta direta ao bridge):
- Existe `price_freshness_threshold_days` em `products` no BD externo?
- Tipo, default, nullable?

Se **existir**: a UI de edição grava direto via `external-db-bridge` (UPDATE).  
Se **não existir**: ativar fallback puro (UI continua mostrando o seletor mas grava em uma tabela local de overrides — `product_freshness_overrides` — sem tocar no BD externo). Plano cobre ambos os caminhos.

**Decisão será tomada após a consulta** — provavelmente a coluna não existe ainda (memory `mem://features/price-freshness-indicator.md` menciona o fallback 60d como já operacional sem dependência da coluna).

## 2. Tabela local de overrides (caminho mais provável)

Criar via `supabase--migration` no BD local:

```sql
CREATE TABLE public.product_price_freshness_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL UNIQUE,
  threshold_days int NOT NULL CHECK (threshold_days IN (30, 60, 90)),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_price_freshness_overrides ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado (vendedores precisam ver)
CREATE POLICY "Authenticated can read" ON public.product_price_freshness_overrides
  FOR SELECT TO authenticated USING (true);

-- Escrita: só admin
CREATE POLICY "Admins can manage" ON public.product_price_freshness_overrides
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE
  ON public.product_price_freshness_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

Por que tabela local em vez de coluna no BD externo:
- BD externo é SSOT do catálogo — alteração estrutural exige coordenação com o time do Promobrind.
- Override local é um conceito **operacional** do nosso vendedor, não dado de catálogo.
- Mantém o SSOT intacto e nos dá deploy imediato.

## 3. Hook `useProductFreshnessOverride`

`src/hooks/useProductFreshnessOverride.ts`:

```ts
export function useProductFreshnessOverride(productId: string) {
  // SELECT pelo product_id; retorna { threshold, isOverride, isLoading }
  // Realtime opcional (canal por product_id)
}

export function useUpdateProductFreshnessOverride() {
  // UPSERT com invalidação do cache do produto + toast
  // Validação client: só aceita 30/60/90
  // Auditoria: insere em admin_audit_log via trigger ou explicitamente
}
```

## 4. Integrar override no fluxo de leitura

`src/utils/product-mapper.ts`:
- `mapPromobrindToProduct` já lê `p.price_freshness_threshold_days`. Adicionar fallback 2-camadas:
  1. Override local (se existir) — injetado via parâmetro extra ou hook ao montar a página.
  2. Coluna externa (se existir).
  3. `null` → util já usa default 60d.

Estratégia mais limpa: hook `useProductWithFreshnessOverride(productId)` que combina `useProduct` + `useProductFreshnessOverride` e devolve o `Product` já com o `priceFreshnessThresholdDays` correto. Usado pela PDP e admin.

## 5. UI de configuração na PDP (admin only)

`src/components/products/PriceFreshnessThresholdEditor.tsx`:
- Botão sutil "Configurar validade" ao lado do `PriceFreshnessBadge variant="pdp"` — visível **só para admins**.
- Abre um `Popover` com:
  - Radio group 30 / 60 / 90 dias.
  - Texto explicativo: "Define quando o sistema avisará que o preço pode estar defasado."
  - Indicador "Padrão: 60 dias" quando não há override.
  - Botões "Restaurar padrão" e "Salvar".
- Após salvar: invalida cache do produto, badge re-renderiza com novo threshold, toast de confirmação.

Ponto de inserção: `src/pages/product-detail/ProductDetailHero.tsx`, logo abaixo do `PriceFreshnessBadge`.

## 6. UI de configuração em massa (admin)

Página nova: `src/pages/admin/PriceFreshnessSettings.tsx` em `/admin/validade-precos`:
- Lista produtos com override custom (não-60d).
- Filtros: por threshold (30/60/90), por categoria.
- Bulk action: "Aplicar 30d a todos da categoria X", "Restaurar padrão".
- Link no `AdminLayout` sidebar.

## 7. Testes

- `tests/utils/price-freshness.test.ts` — já cobre 30/60/90 e fallback. Sem mudança.
- `tests/components/PriceFreshnessThresholdEditor.test.tsx` — novo: render, seleção, salvar, restaurar.
- `tests/hooks/useProductFreshnessOverride.test.ts` — novo: read, upsert, invalidação.

## 8. Memória

Atualizar `mem://features/price-freshness-indicator.md` com:
- Tabela `product_price_freshness_overrides` (local, RLS admin-only).
- Hook `useProductFreshnessOverride`.
- Editor inline na PDP + página `/admin/validade-precos`.
- Política: override local **sobrescreve** valor do BD externo se ambos existirem.

## Arquivos tocados

**Criados (5)**:
- Migration: `product_price_freshness_overrides` + RLS
- `src/hooks/useProductFreshnessOverride.ts`
- `src/components/products/PriceFreshnessThresholdEditor.tsx`
- `src/pages/admin/PriceFreshnessSettings.tsx`
- 2 arquivos de teste

**Editados (3)**:
- `src/pages/product-detail/ProductDetailHero.tsx` (renderiza editor para admin)
- `src/utils/product-mapper.ts` (assinatura aceita override opcional)
- `src/App.tsx` (rota admin)
- `src/components/admin/AdminSidebar.tsx` (link no menu)
- `mem://features/price-freshness-indicator.md`

## Compatibilidade

- Zero breaking change: ausência de override → comportamento atual (BD externo OU fallback 60d).
- SSOT preservado: BD externo continua como fonte primária; override é uma camada operacional adicional.
- Caso a coluna `price_freshness_threshold_days` venha a ser criada no BD externo no futuro, a precedência fica clara: override local > BD externo > default 60d.
- RLS garante que só admins configuram; vendedores apenas leem.

## Pergunta antes de prosseguir

Posso confirmar que a coluna `price_freshness_threshold_days` **não existe** no BD externo hoje (e portanto vamos com a tabela local de overrides)? Ou você prefere que eu tente alterar o BD externo direto (exige acesso/coordenação)?

