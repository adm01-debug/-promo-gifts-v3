
User quer 2 bancos de kits no Kit Maker:
1. **Banco "Meus Kits"** — kits criados pelo próprio vendedor, com identidade visual (nome, cor/tag, ícone), buscáveis.
2. **Banco "Kits Sugeridos"** — biblioteca curada pelo sistema (templates pré-prontos) que o vendedor pode clonar e adaptar.

Investigação:
- Já existe `custom_kits` (RLS por user_id), página `/meus-kits` (MeusKitsPage.tsx) e hook `useCustomKitPersistence`.
- Falta: identidade visual (cor/tag/ícone), banco de templates compartilhados, página unificada de "Biblioteca de Kits" com 2 abas (Meus / Sugeridos).

# Plano

## 1. Backend — schema
**Migração 1: enriquecer `custom_kits`**
- `color` text (hex, default `#3B82F6`)
- `tag` text (ex: "Onboarding", "Cliente VIP", "Natal")
- `icon` text (lucide icon name, default `Package`)
- `description` text (curta, opcional)
- `is_favorite` boolean default false

**Migração 2: nova tabela `kit_templates`** (banco curado pelo sistema)
- `id`, `name`, `description`, `category` (ex: "Tecnologia", "Bem-estar", "Premium"), `color`, `icon`, `tag`
- `box_data jsonb`, `items_data jsonb`, `personalization_data jsonb`
- `total_price numeric`, `volume_usage_percent numeric`
- `created_by uuid` (admin que cadastrou), `is_active boolean`, `usage_count int` (popularidade)
- `cover_image_url text` (opcional)
- RLS: `SELECT` público para autenticados; `INSERT/UPDATE/DELETE` apenas `admin` (via `has_role`)
- Seed de 6 templates iniciais (Tech Premium, Bem-estar Essencial, Natal Corporativo, Onboarding Novo Funcionário, Cliente Top, Eco-friendly)

## 2. Frontend
**A. `KitLibraryPage.tsx`** (substitui/expande `MeusKitsPage`)
- Header: "Biblioteca de Kits" + busca global + filtro por tag/cor
- Tabs: **Meus Kits** | **Sugeridos pelo Sistema** | **Favoritos**
- Cards ricos: ícone colorido + nome + tag pill + preço + volume bar + ações (editar, duplicar, favoritar, excluir)
- Empty states bonitos por aba
- Botão "Usar este template" em sugeridos → cria cópia em `custom_kits`

**B. `useKitTemplates.ts`** (hook novo) — lista templates ativos, ordena por `usage_count`, ação `cloneToMyKits()`

**C. Edição de identidade visual no `KitBuilderHeader`**
- Botão "Identidade" abre popover: color picker (8 cores pré-definidas), seletor de ícone (12 ícones lucide), input de tag
- Persistir nos novos campos

**D. `useCustomKitPersistence` atualizado** — incluir `color/tag/icon/description/is_favorite` no payload

## 3. Validação
- TS check, RLS check, seed verificado, navegação `/meus-kits` → `KitLibraryPage`.

## Arquivos
- **Migrações**: 2 (schema + seed)
- **Novos**: `KitLibraryPage.tsx`, `useKitTemplates.ts`, `KitIdentityPicker.tsx`, `KitTemplateCard.tsx`, `MyKitCard.tsx`
- **Modificados**: `App.tsx` (rota), `KitBuilderHeader.tsx`, `useCustomKitPersistence.ts`, `KitBuilderPage.tsx`, `types.ts` (KitState ganha color/tag/icon)
