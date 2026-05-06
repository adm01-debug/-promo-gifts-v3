import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const SUMMARY_PATH = path.resolve("coverage/coverage-summary.json");
const MIN_TOTAL_COVERAGE = 80; // Meta global

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(SUMMARY_PATH)) {
  fail("Relatório de cobertura não encontrado. Rode 'npm run test:coverage' primeiro.");
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf8"));
const total = summary.total;

if (!total) {
  fail("Dados de cobertura total não encontrados no summary.");
}

console.log("\nRelatório de Cobertura Global:");
console.log(`Statements: ${total.statements.pct}%`);
console.log(`Branches: ${total.branches.pct}%`);
console.log(`Functions: ${total.functions.pct}%`);
console.log(`Lines: ${total.lines.pct}%`);

if (total.lines.pct < MIN_TOTAL_COVERAGE) {
  fail(`Cobertura global (${total.lines.pct}%) está abaixo da meta de ${MIN_TOTAL_COVERAGE}%!`);
}

console.log("\n✅ Cobertura global aprovada.\n");
