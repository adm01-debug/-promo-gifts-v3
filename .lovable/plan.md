

Usuário quer unificar o módulo "Gestão de Descontos" (`/admin/aprovacoes-desconto`) dentro do módulo "Usuários" (`/admin/usuarios`) como uma nova aba, eliminando a entrada separada na sidebar.

## Investigação rápida necessária

Antes do plano final, preciso confirmar:
- Localizar item da sidebar "Gestão de Descontos" / "Aprovações de Desconto"
- Confirmar componentes envolvidos: `SellerDiscountLimitsPanel`, `DiscountApprovalQueue`, hook `usePendingDiscountApprovals` (para badge de pendentes)
- Verificar se há outros pontos de entrada (links internos, breadcrumbs)

## Plano de execução

### 1. Adicionar abas em `AdminUsuariosPage.tsx`
Atualmente tem 2 abas: "Usuários & Roles" + "Reset de Senha". Adicionar 2 novas:
- **"Limites de Desconto"** → renderiza `<SellerDiscountLimitsPanel />`
- **"Aprovações de Desconto"** → renderiza `<DiscountApprovalQueue />` com badge de contagem pendente (mesmo padrão do Reset)

Imports novos:
```ts
import { SellerDiscountLimitsPanel } from "@/components/admin/SellerDiscountLimitsPanel";
import { DiscountApprovalQueue } from "@/components/admin/DiscountApprovalQueue";
import { Percent, ShieldAlert } from "lucide-react";
```

Hook para badge de pendentes (vou localizar o hook usado atualmente em `AdminDiscountApprovalsPage` ou criar um pequeno fetcher se ainda não existir).

### 2. Estender `UserStatsCards`
Adicionar 2 KPIs ao grid existente (de 5 para 7 colunas, ou criar segunda linha):
- "Aprovações Pendentes" (de descontos)
- "Vendedores com Limite" (X/total)

Alternativa mais limpa: manter `UserStatsCards` com 5 e exibir os 2 novos KPIs apenas quando a aba de descontos estiver ativa, dentro do conteúdo da aba (já existem nos painéis internos). **Decisão: deixar os KPIs específicos dentro dos próprios painéis de desconto** (que já mostram média/contagem) para evitar duplicação e manter o `UserStatsCards` focado em usuários.

### 3. Atualizar roteamento
- `src/App.tsx`: redirecionar `/admin/aprovacoes-desconto` → `/admin/usuarios?tab=discount-approvals` (Navigate replace), preservando deep links existentes.
- `AdminUsuariosPage`: ler query param `?tab=` e usar como `defaultValue` do `<Tabs>` (controlado), permitindo deep link direto às novas abas.

### 4. Sidebar
- Remover item "Gestão de Descontos" / "Aprovações de Desconto" do `SidebarReorganized.tsx`.
- Manter badge global de pendentes? Sim — mover lógica de badge (se existir na sidebar) para o item "Usuários", somando reset pendentes + descontos pendentes.

### 5. Deletar arquivo
- `src/pages/AdminDiscountApprovalsPage.tsx` (substituído pelas abas).
- Remover lazy import correspondente em `App.tsx`.

### 6. Documentação/memória
- Atualizar `mem://features/quote-discount-approval-workflow` para refletir nova localização (`/admin/usuarios` aba "Aprovações de Desconto").
- E2E `e2e/discount-approval.spec.ts`: atualizar URL de `/admin/aprovacoes-desconto` para `/admin/usuarios?tab=discount-approvals` (mantém checagem de auth).

## Resumo da nova estrutura de abas em `/admin/usuarios`

```text
[Usuários & Roles] [Reset de Senha (N)] [Limites de Desconto] [Aprovações de Desconto (N)]
```

Reversível, não-destrutivo, sem migração de banco.

