/**
 * Helpers OBRIGATÓRIOS para criar recursos nomeáveis em testes E2E.
 *
 * Garantem que TODO orçamento, coleção, lista de favoritos, kit ou cart
 * template criado por um spec carregue o prefixo `e2eName(...)`. Isso é
 * pré-requisito para que o `e2e-cleanup` (com `nameFilterPrefix` ativo)
 * apague apenas os dados criados por testes — nunca dados manuais.
 *
 * REGRA:
 *   - NUNCA escreva diretamente no input de nome via `page.fill(...)`.
 *   - SEMPRE passe por `fillResourceNameField(...)` ou pelos atalhos
 *     `createE2eQuote / createE2eCollection / createE2eFavoriteList /
 *     createE2eCartTemplate / createE2eCustomKit`.
 *
 * Caso o helper detecte que o valor passado não começa com `getTestPrefix()`,
 * ele LANÇA imediatamente — falha rápido em vez de poluir o BD.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { e2eName, getTestPrefix } from "../fixtures/test-user";
import { Sel } from "../fixtures/selectors";

/**
 * Guarda runtime: lança se `value` não começa com o prefixo de E2E.
 * Use SEMPRE que houver um `.fill()` em campo nomeável (orçamento,
 * coleção, lista, etc.).
 */
export function assertE2eName(value: string, context = "resource"): void {
  const prefix = getTestPrefix();
  if (!value.startsWith(prefix)) {
    throw new Error(
      `[e2e-resources] ${context} name="${value}" não usa o prefixo "${prefix}". ` +
        `Use e2eName("${context}") em vez de strings literais — caso contrário ` +
        `o cleanup com nameFilterPrefix=true não conseguirá apagar este recurso ` +
        `e o teste pode acidentalmente impactar dados fora do escopo.`,
    );
  }
}

/**
 * Preenche um campo de nome de recurso APLICANDO a guarda `assertE2eName`.
 * Aceita o locator do input (já resolvido pelo spec) e o valor.
 */
export async function fillResourceNameField(
  field: Locator,
  value: string,
  context = "resource",
): Promise<void> {
  assertE2eName(value, context);
  await field.waitFor({ state: "visible", timeout: 8_000 });
  await field.fill(value);
}

// ─────────────────────────────────────────────────────────────────────────
// Atalhos por domínio — geram o nome internamente para impedir engano.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Cria um orçamento via UI usando um nome E2E. Retorna o nome efetivamente
 * usado para o spec poder buscar/limpar pontualmente.
 *
 * Pré-condições:
 *   - O spec já navegou para `/orcamentos/novo` e o wizard está visível.
 *   - O input de cliente (data-testid="quote-client-name") existe na etapa atual.
 */
export async function createE2eQuote(
  page: Page,
  opts: { label?: string; submit?: boolean } = {},
): Promise<{ name: string }> {
  const name = e2eName(opts.label ?? "orcamento");
  const field = page.locator('[data-testid="quote-client-name"]').first();
  await fillResourceNameField(field, name, "quote.client_name");
  if (opts.submit) {
    const submit = page
      .locator('[data-testid="quote-submit"], [data-testid="quote-save"]')
      .first();
    await submit.waitFor({ state: "visible", timeout: 8_000 });
    await submit.click();
  }
  return { name };
}

/**
 * Cria uma coleção via UI usando um nome E2E.
 * Pré-condição: o spec abriu o modal/dialog de "Nova Coleção".
 */
export async function createE2eCollection(
  page: Page,
  opts: { label?: string; submit?: boolean } = {},
): Promise<{ name: string }> {
  const name = e2eName(opts.label ?? "colecao");
  const field = page.locator('[data-testid="collection-name-input"]').first();
  await fillResourceNameField(field, name, "collection.name");
  if (opts.submit) {
    const submit = page.locator('[data-testid="collection-create-submit"]').first();
    await submit.waitFor({ state: "visible", timeout: 8_000 });
    await submit.click();
  }
  return { name };
}

/**
 * Cria uma lista de favoritos via UI usando um nome E2E.
 * Pré-condição: o spec abriu o modal/dialog de "Nova Lista" em /favoritos.
 */
export async function createE2eFavoriteList(
  page: Page,
  opts: { label?: string; submit?: boolean } = {},
): Promise<{ name: string }> {
  const name = e2eName(opts.label ?? "favorite-list");
  const field = page.locator('[data-testid="favorite-list-name-input"]').first();
  await fillResourceNameField(field, name, "favorite_lists.name");
  if (opts.submit) {
    const submit = page.locator('[data-testid="favorite-list-create-submit"]').first();
    await submit.waitFor({ state: "visible", timeout: 8_000 });
    await submit.click();
  }
  return { name };
}

/**
 * Cria um cart template via UI usando um nome E2E.
 */
export async function createE2eCartTemplate(
  page: Page,
  opts: { label?: string; submit?: boolean } = {},
): Promise<{ name: string }> {
  const name = e2eName(opts.label ?? "cart-template");
  const field = page.locator('[data-testid="cart-template-name-input"]').first();
  await fillResourceNameField(field, name, "cart_templates.name");
  if (opts.submit) {
    const submit = page.locator('[data-testid="cart-template-save"]').first();
    await submit.waitFor({ state: "visible", timeout: 8_000 });
    await submit.click();
  }
  return { name };
}

/**
 * Cria um custom kit (Kit Maker) via UI usando um nome E2E.
 */
export async function createE2eCustomKit(
  page: Page,
  opts: { label?: string; submit?: boolean } = {},
): Promise<{ name: string }> {
  const name = e2eName(opts.label ?? "custom-kit");
  const field = page.locator('[data-testid="custom-kit-name-input"]').first();
  await fillResourceNameField(field, name, "custom_kits.name");
  if (opts.submit) {
    const submit = page.locator('[data-testid="custom-kit-save"]').first();
    await submit.waitFor({ state: "visible", timeout: 8_000 });
    await submit.click();
  }
  return { name };
}

/**
 * Espera que um recurso de nome E2E apareça na lista correspondente,
 * usando um seletor de container (ex.: Sel.collections.list ou
 * Sel.favorites.list). Útil em asserts pós-criação.
 */
export async function expectE2eResourceVisible(
  page: Page,
  containerSelector: string,
  resourceName: string,
): Promise<void> {
  assertE2eName(resourceName, "resource (assert)");
  void Sel; // mantém referência para garantir consistência de import
  await expect(
    page.locator(`${containerSelector} :text("${resourceName}")`).first(),
    `recurso "${resourceName}" deveria estar visível em ${containerSelector}`,
  ).toBeVisible({ timeout: 10_000 });
}
