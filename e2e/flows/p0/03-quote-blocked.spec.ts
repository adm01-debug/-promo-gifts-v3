/**
 * P0 — Orçamento bloqueado: CRM/Bitrix offline durante criação ou aprovação.
 */
import { test, expect } from "../../fixtures/test-base";
import { Sel } from "../../fixtures/selectors";
import { mockBitrixWebhookFail, mockCrmBridgeOffline } from "./_mocks";

test.describe("P0 — Orçamento bloqueado", () => {
  test.skip("bitrix-sync 502: orçamento é salvo localmente e enfileirado para retry", async ({ page }) => {
    await mockBitrixWebhookFail(page);
    await page.goto("/orcamentos/novo");
    // TODO(P0): completar wizard com fixtures e submeter.
    // Esperado: toast "salvo, aguardando sincronização com CRM" + status='pending_sync'.
    await expect(page.locator(Sel.app.toast).or(page.getByRole("alert"))).toContainText(
      /aguardando.*sincroniz|fila.*retry/i,
    );
  });

  test.skip("crm-db-bridge 503: seletor de empresa cai pra busca local sem travar", async ({ page }) => {
    await mockCrmBridgeOffline(page);
    await page.goto("/orcamentos/novo");
    // TODO(P0): abrir CartCompanyPicker e validar fallback.
    expect(true).toBe(true);
  });

  test.skip("aprovação pública: token inválido NÃO expõe outros orçamentos", async ({ page }) => {
    await page.goto("/orcamento-publico/INVALID_TOKEN");
    await expect(page.getByText(/não encontrado|inválido|expirado/i)).toBeVisible();
    // Garantir que não vaza dados de outros orçamentos.
    expect(await page.locator('[data-testid^="quote-item"]').count()).toBe(0);
  });
});
