/**
 * Auth setup — roda UMA vez antes dos projects autenticados.
 * Faz login real com E2E_USER_EMAIL/E2E_USER_PASSWORD e salva storageState.
 *
 * Se as variáveis não estiverem definidas, grava um storage vazio e os
 * specs autenticados detectam via test.skip(!process.env.E2E_USER_EMAIL, ...).
 */
import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const STORAGE = path.resolve(__dirname, "../.auth/storageState.json");

setup("authenticate", async ({ page }) => {
  fs.mkdirSync(path.dirname(STORAGE), { recursive: true });

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    // Sem credenciais: grava state vazio para os projects authed iniciarem
    // (specs autenticados se auto-marcam como skip).
    fs.writeFileSync(
      STORAGE,
      JSON.stringify({ cookies: [], origins: [] }, null, 2),
      "utf-8",
    );
    setup.info().annotations.push({
      type: "skip-reason",
      description:
        "E2E_USER_EMAIL/E2E_USER_PASSWORD ausentes — specs autenticados serão pulados.",
    });
    return;
  }

  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('button[type="submit"]');

  // Espera redirect para fora de /login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  await page.context().storageState({ path: STORAGE });
});
