# Validações adicionais no E2E de Favoritos

## Objetivo

Estender o spec `e2e/flows/08-favorites.spec.ts` com asserts robustos sobre **título**, **ícone/label** e **contagem** da lista de favoritos, validando o estado **antes e depois do reload**.

## Diagnóstico

O header de `/favoritos` (`src/pages/FavoritesPage.tsx` linhas 347–360) já expõe:

- `h1[data-testid="page-title-favoritos"]` com texto "Meus Favoritos"
- Ícone `Heart` (lucide) dentro de um `div` com `bg-destructive/10` (sem testid)
- Parágrafo com contagem: `{n} item(s) • {n} lista(s)` (sem testid)
- Botões de remover: `aria-label="Remover favorito"`

Para asserts estáveis (sem depender de regex frágil de texto), adiciono **testids** no ícone e nos contadores.

## Mudanças

### 1. `src/pages/FavoritesPage.tsx` — adicionar testids no header

Substituir o bloco do header (linhas 347–360) por uma versão com:

- `data-testid="favorites-icon"` + `aria-label="Favoritos"` no wrapper do ícone Heart
- `data-testid="favorites-count"` no parágrafo do contador
- `data-testid="favorites-count-items"` em `<span>` envolvendo o número de itens
- `data-testid="favorites-count-lists"` em `<span>` envolvendo o número de listas (quando presente)

Sem mudanças visuais ou comportamentais — apenas atributos.

### 2. `e2e/fixtures/selectors.ts` — adicionar entradas em `Sel.favorites`

```ts
favorites: {
  // ... existente ...
  title: '[data-testid="page-title-favoritos"]',
  icon: '[data-testid="favorites-icon"]',
  count: '[data-testid="favorites-count"]',
  countItems: '[data-testid="favorites-count-items"]',
  countLists: '[data-testid="favorites-count-lists"]',
}
```

### 3. `e2e/flows/08-favorites.spec.ts` — novos asserts

**Helper novo** (dentro do mesmo arquivo):

```ts
async function readFavoritesCount(page: Page): Promise<number> {
  const txt = (await page.locator(Sel.favorites.countItems).innerText()).trim();
  return Number.parseInt(txt, 10) || 0;
}
```

**Assert reutilizável** para cada checagem do header:

```ts
async function assertHeaderConsistency(page: Page, expectedCount: number) {
  // título
  await expect(page.locator(Sel.favorites.title)).toHaveText("Meus Favoritos");
  // ícone + label
  await expect(page.locator(Sel.favorites.icon)).toBeVisible();
  await expect(page.locator(Sel.favorites.icon)).toHaveAttribute("aria-label", "Favoritos");
  await expect(page.locator(`${Sel.favorites.icon} svg`)).toBeVisible();
  // contagem visível e numérica
  const count = await readFavoritesCount(page);
  expect(count).toBe(expectedCount);
  // contagem de itens deve bater com o número de cards renderizados
  const cards = await page.locator(Sel.favorites.remove).count();
  expect(cards).toBe(expectedCount);
}
```

**Modificar o teste "favorita um produto, recarrega e ele persiste"**:

Inserir 3 pontos de validação:

1. **Antes de favoritar** — visita `/favoritos`, lê `countBefore`.
2. **Depois de favoritar, antes do reload** — após voltar a `/favoritos`, valida:
   - título = "Meus Favoritos"
   - ícone visível com `aria-label="Favoritos"` e svg renderizado
   - `countItems == countBefore + 1`
   - número de botões "Remover favorito" == `countBefore + 1`
3. **Depois do `page.reload()`** — repete `assertHeaderConsistency(page, countBefore + 1)`.
4. **Após cleanup** (remover o favorito) — `assertHeaderConsistency(page, countBefore)`.

**Novo teste "header de favoritos é consistente em estado vazio"** (extra):

- Limpa todos os favoritos (se houver) com botão "Limpar Tudo" ou via store.
- Recarrega `/favoritos`.
- Valida: título visível, ícone visível com label, `countItems == 0`, mensagem "sem favoritos / nenhum favorito".

## Detalhes técnicos

- `Sel.favorites.title/icon/count/countItems/countLists` são adicionados sem remover seletores existentes (zero impacto nos testes legados).
- Os testids no `src/` são puros atributos — sem mudança de layout, props ou estilo.
- Asserts usam `expect(...).toHaveText(...)` exato para o título e `Number.parseInt` para a contagem, evitando falsos positivos por texto traduzido.
- A consistência **contagem ↔ número de cards** é verificada nos dois snapshots (pré-reload e pós-reload), validando que o estado persistido bate com o renderizado.

## Arquivos afetados

Editar:
- `src/pages/FavoritesPage.tsx` (linhas 347–360 — adicionar 4 testids + aria-label)
- `e2e/fixtures/selectors.ts` (estender `Sel.favorites` com 5 entradas)
- `e2e/flows/08-favorites.spec.ts` (helper `readFavoritesCount` + `assertHeaderConsistency` + 4 pontos de validação no teste de reload + 1 teste novo "estado vazio")

## Fora de escopo

- Não alterar `FavoritesViewHeader` (header da lista remota selecionada — é outro componente).
- Não mexer em `useFavoritesStore` ou nos hooks de migração.
- Não rodar a suíte (Playwright não está instalado neste sandbox); validação fica para o usuário via `npm run test:e2e -- e2e/flows/08-favorites.spec.ts`.
