# E2E: favoritar a partir da página de detalhe e validar persistência

## Objetivo

Criar um spec Playwright dedicado que **favorita um produto na rota de detalhe** (`/produto/:id`) e depois confirma que ele aparece em `/favoritos` antes e **após reload**.

## Diagnóstico

- `08-favorites.spec.ts` cobre o fluxo a partir do **card do catálogo**.
- Falta cobrir o caminho a partir do **detalhe**, que tem 3 entradas para o botão Favoritar:
  - `ProductDetailHero` — botão com texto "Favoritar"/"Favoritado".
  - `ProductStickyHeader` — `aria-label="Favoritar"`.
  - `MobileProductActions` — `aria-label="Favoritar"`.
- Quando NÃO está favoritado, clicar abre `VariantPickerDialog` (mode `favorite`). Para tornar o teste estável, escolhemos **"Sem cor específica"** (opção do `SingleVariantPicker`).
- Para desfavoritar, o detalhe remove direto (sem dialog); cleanup é feito pela lista usando `Sel.favorites.remove`.

## Arquivo novo

### `e2e/flows/09-favorite-from-detail.spec.ts`

Estrutura:

1. `requireAuth()` no `beforeEach`.
2. Snapshot inicial: `gotoAndSettle("/favoritos")` → `countBefore = readFavoritesCount(page)`.
3. `gotoAndSettle("/produtos")` → pega 1º card → resolve `href` de `a[href^="/produto/"]` (fallback: `card.click()` + `waitForURL(/\/produto\/[^/]+/)`).
4. `gotoAndSettle(detailHref)` + espera por `[data-state="loading"]` sumir; assert `/produto/<id>` na URL.
5. `productName` lido do `h1`/`h2` do detalhe.
6. Localiza o botão Favoritar via seletor combinado (`aria-label` + texto). Garante estado inicial = não-favoritado (se "Favoritado", clica para desfazer).
7. Clica em Favoritar; se aparecer `[role="dialog"]` com texto `/sem cor específica/i`, clica nele.
8. `expect.poll` no texto do botão para confirmar que virou "Favoritado".
9. `gotoAndSettle("/favoritos")`:
   - `readFavoritesCount === countBefore + 1`
   - `getByText(productRegex)` visível.
10. `page.reload()` + revalida contagem e visibilidade do produto.
11. **Cleanup**: clica em `favorite-remove` no card que casa com `productName` (fallback: primeiro), aceita eventual `[role="alertdialog"]`, espera contagem voltar a `countBefore`, recarrega e confirma `toHaveCount(0)` para `productRegex`.

## Detalhes técnicos

- Reutiliza `Sel.favorites.*`, `Sel.product.card`, `gotoAndSettle`, `requireAuth`, `test-base`.
- Helper local `readFavoritesCount` espelha o do spec 08 (não vale extrair agora — apenas dois usos).
- Detecção de "Favoritado" usa `el.textContent` para cobrir Hero (texto) e `aria-pressed` opcional para os outros.
- Sem alterações em `src/` ou em `selectors.ts` — o `aria-label="Favoritar"` já existe nos componentes Sticky/Mobile e o texto "Favoritar"/"Favoritado" cobre o Hero.

## Validação

`npx tsc --noEmit -p tsconfig.json` para checar tipos do novo spec.

## Fora de escopo

- Não cobrir variant picker com seleção de cor real (o "sem cor" mantém o teste determinístico).
- Não criar abstração compartilhada entre os specs 08 e 09 ainda — fazer só quando surgir um terceiro caso.
