import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * Script para validar cobertura por rota/feature com base no feature-summary.json do Playwright.
 * Falha se qualquer rota crítica estiver abaixo do floor configurado.
 */

const SUMMARY_PATH = path.resolve("playwright-report/feature-summary.json");
const CONFIG_PATH = path.resolve("tests/route-coverage-config.json");

function fail(msg) {
  console.error(`\n❌ [route-gate] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(SUMMARY_PATH)) {
  fail("feature-summary.json não encontrado. Certifique-se de que o reporter JSON do Playwright e o script e2e-feature-summary rodaram.");
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf8"));
const config = fs.existsSync(CONFIG_PATH) 
  ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) 
  : { floors: { "auth": 100, "default": 80 } };

console.log("\n📊 Validando Cobertura por Rota (E2E):");

let hasError = false;
const results = summary.features || [];

results.forEach(feat => {
  const floor = config.floors[feat.feature] || config.floors.default || 80;
  const passRate = feat.total > 0 ? (feat.passed / (feat.total - feat.skipped)) * 100 : 0;
  
  const status = passRate >= floor ? "✅" : "❌";
  console.log(`${status} ${feat.feature.padEnd(30)} | Rate: ${passRate.toFixed(1)}% | Alvo: ${floor}%`);
  
  if (passRate < floor) {
    hasError = true;
  }
});

if (hasError) {
  fail("Uma ou mais rotas estão abaixo do alvo de qualidade/cobertura.");
}

console.log("\n✅ Todas as rotas críticas atingiram o alvo de qualidade.\n");
