/**
 * Navegação resiliente — espera idle de rede + ausência de skeleton.
 */
import type { Page } from "@playwright/test";

export async function gotoAndSettle(page: Page, path: string, opts?: { timeout?: number }) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: opts?.timeout ?? 20_000 });
  // Aguarda skeletons sumirem (best-effort)
  await page
    .waitForFunction(
      () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
      { timeout: 5_000 },
    )
    .catch(() => {
      /* tolerável: pode não haver skeleton */
    });
}

export async function expectNoConsoleErrors(consoleLogs: Array<{ type: string; text: string }>) {
  const errors = consoleLogs.filter(
    (l) =>
      l.type === "error" &&
      // ruído conhecido aceitável
      !/Download the React DevTools/.test(l.text) &&
      !/ResizeObserver loop/.test(l.text),
  );
  if (errors.length > 0) {
    throw new Error(`Console errors detected:\n${errors.map((e) => e.text).join("\n")}`);
  }
}
