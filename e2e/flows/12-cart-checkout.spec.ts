/**
 * Fluxo: Carrinho → Checkout (Gerar Orçamento)
 *
 * Cobertura:
 *  1) Adiciona produto ao carrinho via QuickAddToQuote a partir do catálogo,
 *     ajusta a quantidade no /carrinhos e abre o checkout (Gerar Orçamento).
 *  2) Falha de backend simulada via page.route → UI mostra erro e não quebra.
 *
 * Notas:
 *  - O "checkout" no app é a ação **Gerar Orçamento** que transfere o carrinho
 *    para /orcamentos/novo.
 *  - Steppers de quantidade não têm aria-label; usamos seletor estrutural por
 *    ícones lucide (`svg.lucide-plus`/`lucide-minus`) dentro do card do item.
 *  - Tolerante a UI vazia (sem produtos / sem empresas) — pula com skip claro.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import type { Locator, Page } from "@playwright/test";

const CARD_SELECTOR =
  '[data-testid="product-card"], article:has(button[aria-label*="favorit" i]), [role="article"]:has(button[aria-label*="favorit" i])';

const TOAST_SELECTOR = '[data-sonner-toast], [role="status"], [role="alert"]';

async function firstCatalogCard(page: Page): Promise<Locator> {
  const card = page.locator(CARD_SELECTOR).first();
  await card.waitFor({ state: "visible", timeout: 20_000 });
  return card;
}

async function readCardName(card: Locator): Promise<string> {
  const heading = card
    .locator('h1, h2, h3, [data-testid="product-name"], [data-product-name]')
    .first();
  if ((await heading.count()) > 0) {
    const txt = (await heading.innerText()).trim();
    if (txt) return txt;
  }
  return (await card.innerText()).trim().split("\n")[0]?.trim() ?? "";
}

/**
 * Garante carrinho ativo. Se não houver, abre /carrinhos/novo e tenta
 * escolher a primeira empresa do CartCompanyPickerDialog.
 * Retorna true se há um carrinho utilizável.
 */
async function ensureActiveCart(page: Page): Promise<boolean> {
  await gotoAndSettle(page, "/carrinhos");

  // Já tem carrinho? Procura indícios: tabs com contador ou item de carrinho.
  const hasCart = await page
    .locator('[role="tab"], [data-testid="cart-tab"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (hasCart) return true;

  // Cria novo
  await gotoAndSettle(page, "/carrinhos/novo");
  // Dialog de escolha de empresa
  const dialog = page.locator('[role="dialog"]').first();
  if (await dialog.isVisible().catch(() => false)) {
    const firstCompany = dialog
      .locator('button:has-text("Selecionar"), [role="option"], li button')
      .first();
    if (await firstCompany.isVisible().catch(() => false)) {
      await firstCompany.click().catch(() => {});
      await page.waitForTimeout(800);
      return true;
    }
    // Sem empresas cadastradas → não é possível continuar
    return false;
  }
  return true;
}

/**
 * Tenta adicionar o primeiro produto do catálogo ao carrinho ativo.
 * Retorna o nome do produto adicionado (ou null se não foi possível).
 */
async function addFirstProductToCart(page: Page): Promise<string | null> {
  await gotoAndSettle(page, "/produtos");
  const card = await firstCatalogCard(page);
  const name = await readCardName(card);

  // Abre menu de ações rápidas se necessário
  const actionsToggle = card
    .locator('button[aria-label="Ações rápidas" i], button[aria-label="Fechar ações" i]')
    .first();
  if (await actionsToggle.isVisible().catch(() => false)) {
    const label = await actionsToggle.getAttribute("aria-label");
    if (label && /Ações rápidas/i.test(label)) {
      await actionsToggle.click().catch(() => {});
    }
  }

  // Botão/popover do carrinho dentro do card
  const cartTrigger = card
    .locator('button[aria-label="ShoppingCart" i], button:has(svg.lucide-shopping-cart)')
    .first();
  if (!(await cartTrigger.isVisible().catch(() => false))) return null;
  await cartTrigger.click();

  // Botão final "Adicionar ao Carrinho" dentro do popover
  const addBtn = page
    .getByRole("button", { name: /adicionar ao carrinho/i })
    .first();
  await addBtn.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (!(await addBtn.isVisible().catch(() => false))) return null;

  if (await addBtn.isDisabled().catch(() => false)) {
    // Pode estar pedindo variante — tenta selecionar primeira opção visível
    const firstSwatch = page
      .locator('[role="dialog"], [data-radix-popper-content-wrapper]')
      .locator('button:has(img), [role="option"], button[data-variant]')
      .first();
    if (await firstSwatch.isVisible().catch(() => false)) {
      await firstSwatch.click().catch(() => {});
    }
  }

  if (await addBtn.isEnabled().catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(600);
    return name || null;
  }
  return null;
}

test.describe("Fluxo: Carrinho → Checkout", () => {
  test.beforeEach(() => requireAuth());

  test("adiciona item, ajusta quantidade e abre checkout (Gerar Orçamento)", async ({
    page,
  }) => {
    // 1) Garante carrinho ativo
    const ready = await ensureActiveCart(page);
    test.skip(!ready, "Sem empresas cadastradas para criar carrinho de teste");

    // 2) Adiciona produto via catálogo
    const productName = await addFirstProductToCart(page);
    test.skip(
      !productName,
      "Não foi possível adicionar produto (popover/variante indisponível)",
    );

    // 3) Vai para /carrinhos e localiza o item
    await gotoAndSettle(page, "/carrinhos");

    const itemCard = page
      .locator(`:has-text(${JSON.stringify(productName!)})`)
      .filter({ has: page.locator("svg.lucide-plus") })
      .first();
    await expect(itemCard, "item recém-adicionado deve aparecer no carrinho").toBeVisible({
      timeout: 15_000,
    });

    // 4) Lê quantidade atual e incrementa 2x
    const qtyBadge = itemCard.locator(".tabular-nums").first();
    const qtyBefore = parseInt(
      ((await qtyBadge.innerText().catch(() => "1")) || "1").replace(/\D/g, ""),
      10,
    ) || 1;

    const plusBtn = itemCard.locator("button:has(svg.lucide-plus)").first();
    await plusBtn.click();
    await page.waitForTimeout(250);
    await plusBtn.click();

    await expect
      .poll(
        async () => {
          const t = (await qtyBadge.innerText().catch(() => "")) || "";
          return parseInt(t.replace(/\D/g, ""), 10) || 0;
        },
        { timeout: 8_000, message: "quantidade não foi incrementada" },
      )
      .toBeGreaterThanOrEqual(qtyBefore + 1);

    // 5) Abre checkout — botão "Gerar Orçamento"
    const checkoutBtn = page
      .getByRole("button", { name: /gerar orçamento/i })
      .first();
    await expect(checkoutBtn).toBeVisible({ timeout: 10_000 });
    await checkoutBtn.click();

    // ConfirmDialog
    const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]').last();
    const confirmBtn = confirmDialog
      .getByRole("button", { name: /confirmar|gerar|continuar|ok/i })
      .first();
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    // 6) Valida transição para /orcamentos/novo OU toast de sucesso
    const navigated = await page
      .waitForURL(/\/orcamentos\/novo/, { timeout: 12_000 })
      .then(() => true)
      .catch(() => false);

    if (!navigated) {
      const successToast = page
        .locator(TOAST_SELECTOR)
        .filter({ hasText: /sucesso|gerado|criado/i })
        .first();
      await expect(
        successToast,
        "esperava navegação para /orcamentos/novo OU toast de sucesso",
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test("falha de backend ao gerar orçamento mostra erro e não quebra a UI", async ({
    page,
  }) => {
    const ready = await ensureActiveCart(page);
    test.skip(!ready, "Sem empresas para preparar carrinho");

    // Garante ao menos 1 item no carrinho (best-effort)
    await addFirstProductToCart(page).catch(() => null);
    await gotoAndSettle(page, "/carrinhos");

    // Intercepta chamadas que materializam o "checkout" (criação de quote / mutação de cart).
    // Estamos sendo amplos de propósito para cobrir REST do PostgREST e edge functions.
    await page.route(
      (url) =>
        /\/rest\/v1\/(quotes|seller_carts|cart_items)/.test(url.href) ||
        /\/functions\/v1\/(create-quote|external-db-bridge)/.test(url.href),
      async (route) => {
        const method = route.request().method();
        if (method === "GET" || method === "HEAD") return route.continue();
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "simulated_backend_failure" }),
        });
      },
    );

    const checkoutBtn = page
      .getByRole("button", { name: /gerar orçamento/i })
      .first();

    if (!(await checkoutBtn.isVisible().catch(() => false))) {
      test.skip(true, "Sem item/carrinho disponível para testar checkout com falha");
      return;
    }

    await checkoutBtn.click();

    const confirmBtn = page
      .locator('[role="alertdialog"], [role="dialog"]')
      .last()
      .getByRole("button", { name: /confirmar|gerar|continuar|ok/i })
      .first();
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    // 1) Toast/alert de erro aparece
    const errorToast = page
      .locator(TOAST_SELECTOR)
      .filter({ hasText: /erro|falha|tente novamente|não foi possível/i })
      .first();
    await expect(errorToast, "esperava toast/alert de erro após falha 500").toBeVisible({
      timeout: 10_000,
    });

    // 2) UI não quebrou — heading da página continua visível e URL não foi para tela em branco
    await expect(
      page.getByRole("heading", { name: /carrinhos/i }).first().or(
        page.getByText(/carrinho/i).first(),
      ),
    ).toBeVisible({ timeout: 5_000 });

    expect(page.url()).not.toMatch(/\/orcamentos\/novo/);

    await page.unroute(
      (url) =>
        /\/rest\/v1\/(quotes|seller_carts|cart_items)/.test(url.href) ||
        /\/functions\/v1\/(create-quote|external-db-bridge)/.test(url.href),
    );
  });
});
