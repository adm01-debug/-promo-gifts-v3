# E2E: persistência de favoritos via leitura de localStorage

## Objetivo

Validar a **persistência real** dos favoritos lendo o estado da sessão (`localStorage["product-favorites"]`) e confirmando que, após `page.reload()`, o favorito é restaurado tanto no storage quanto na UI. Também valida o caminho inverso: pré-popular o storage e confirmar que a UI hidrata corretamente.

## Diagnóstico

- `src/hooks/useFavorites.ts` persiste em `localStorage` com chave `product-favorites` no formato `[{ productId: string, addedAt: ISOString }]`.
- O hook hidrata o estado a partir do storage no mount (`useEffect` com `isLoaded`).
- Não há backend para favoritos — toda a persistência é client-side.
- Specs existentes (`08-favorites`, `09-favorite-from-detail`) validam pela UI mas não inspecionam o storage.

## Arquivo novo

### `e2e/flows/10-favorites-persistence-storage.spec.ts`

Helpers locais:
- `STORAGE_KEY = "product-favorites"`
- `readStorage(page)` → `JSON.parse(localStorage[STORAGE_KEY] || "[]")` via `page.evaluate`
- `writeStorage(page, items)` → `localStorage.setItem(...)` via `page.evaluate`
- `clearStorage(page)` → remove a chave
- `readFavoritesCount(page)` (mesmo do spec 08)

### Teste 1 — favoritar pela UI persiste no storage e sobrevive ao reload

1. `requireAuth()`.
2. `gotoAndSettle("/produtos")`.
3. Lê snapshot inicial via `readStorage(page)` (`before`).
4. Favorita o 1º card (clica em `Sel.product.favorite`).
5. **Antes do reload** valida:
   - `readStorage(page)` tem **exatamente 1 item a mais** que `before`.
   - O novo item tem `productId` (string não-vazia) e `addedAt` parseável como `Date`.
6. `page.reload()` no `/produtos`.
7. **Após reload** valida que `readStorage(page)` é igual ao snapshot pós-favoritar (mesmo `productId`).
8. `gotoAndSettle("/favoritos")` + `readFavoritesCount === before.length + 1`.
9. Cleanup: `clearStorage` ou remove só o item adicionado e revalida via UI.

### Teste 2 — pré-popular storage hidrata a UI após reload (round-trip)

1. `requireAuth()`.
2. `gotoAndSettle("/produtos")` para garantir que algum produto é conhecido.
3. Lê o `productId` do 1º card (atributo `data-product-id` se existir, senão extrai do `href` `/produto/<id>` do `a` interno).
4. `clearStorage(page)` + `writeStorage(page, [{ productId, addedAt: new Date().toISOString() }])`.
5. `gotoAndSettle("/favoritos")` (carregamento fresco — força hidratação a partir do storage).
6. Valida que:
   - `readFavoritesCount(page) === 1`
   - Existe pelo menos um `Sel.favorites.remove` visível.
7. `page.reload()` e revalida o mesmo (persistência sobrevive a reload sem nenhuma ação de UI).
8. Cleanup: `clearStorage(page)`.

## Detalhes técnicos

- Captura de `productId` no card: tentar `data-product-id` em qualquer ancestral; fallback para regex no `href` (`/^\/produto\/([^/?#]+)/`).
- `writeStorage` antes de navegar para `/favoritos` precisa rodar **na mesma origin** — por isso navegamos primeiro para `/produtos` (mesma origin do app), depois escrevemos, depois vamos para `/favoritos`.
- Validações de tipo no item do storage usam `expect(typeof item.productId).toBe("string")` e `expect(Number.isFinite(Date.parse(item.addedAt))).toBe(true)`.
- Sem mudanças em `src/`, `selectors.ts` ou config.

## Validação

`npx tsc --noEmit -p tsconfig.json` para checar tipos.

## Fora de escopo

- Não cobre listas de favoritos (`useFavoriteLists`) — é outra chave de storage.
- Não cobre cookies/sessão Supabase (favoritos não usam backend).
- Sem mudanças no `08-favorites` ou `09-favorite-from-detail`.
