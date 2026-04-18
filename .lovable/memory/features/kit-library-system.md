---
name: Kit Library System
description: Arquitetura dos 2 bancos do Kit Maker (Meus Kits + Sugeridos), identidade visual, RLS e fluxo de clonagem
type: feature
---

# Kit Library — Banco duplo (Meus Kits + Sugeridos)

## Tabelas

- **`custom_kits`** — kits do vendedor. RLS: usuário só vê os próprios; admin vê todos. Campos de identidade: `color`, `icon` (lucide), `tag`, `description`, `is_favorite`.
- **`kit_templates`** — banco curado pelo sistema. RLS: leitura para qualquer autenticado quando `is_active=true`; CRUD apenas admin (`has_role(uid, 'admin')`). Campos: `category`, `cover_image_url`, `usage_count` (incrementado via RPC `increment_kit_template_usage`).

## Frontend

- **Página unificada**: `/meus-kits` → `KitLibraryPage.tsx` com 3 abas (Meus / Sugeridos / Favoritos), busca, filtros visuais (chips por tag e cor) e ordenação (recentes, valor, nome, popularidade).
- **Identidade visual**: editada via `KitIdentityPicker` no header do Kit Builder; reflete-se como stripe colorida + ícone no próprio header.
- **Persistência**: `useCustomKitPersistence` envia identidade no payload de save; `loadKit()` em `useKitBuilder` aceita `identity` e popula o estado ao reabrir.
- **Templates**: `useKitTemplates` lista (ordenado por `usage_count`) e clona para `custom_kits`; `KitTemplatePreviewDialog` mostra caixa+itens+preço antes da clonagem; badge "Popular" em `usage_count >= 5`.
- **Admin**: `/admin/kit-templates` (`KitTemplatesAdminPage`) faz CRUD via `useAdminKitTemplates` (somente admins). Para popular box/items reais, o fluxo recomendado é: criar template → clonar como kit próprio → preencher na UI normal → admin pode atualizar template depois.

## Skeletons & UX

- `KitCardSkeleton` / `KitCardSkeletonGrid` no padrão `loading-and-skeleton-standard` (sem stagger artificial).
- Empty states ilustrados com CTA secundário levando à aba de templates.
- Animação `animate-fade-in` no container; sem stagger por item para evitar jank em listas grandes.

## Pontos de atenção

- O Kit Library reusa a key `['custom-kits']` que `useCustomKitPersistence` invalida — qualquer mudança de payload deve manter compatibilidade.
- `getItemsCount` soma `quantity` mas tolera items sem `quantity` (defaulta a 1) para suportar templates antigos.
- `KitTemplateRow.items_data` é `Record<string, unknown>[]` — o preview não renderiza imagens, apenas nome/sku/qtd/preço.
