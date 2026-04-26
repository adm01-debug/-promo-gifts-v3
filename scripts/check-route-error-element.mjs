#!/usr/bin/env node
/**
 * check-route-error-element.mjs
 *
 * Falha o CI se aparecer `errorElement={...}` em qualquer arquivo que
 * importa `react-router-dom` no modo declarativo (BrowserRouter + Routes).
 *
 * Razão: em react-router-dom v6 o prop `errorElement` SÓ é honrado dentro
 * de um data router (createBrowserRouter + RouterProvider). Em <Routes>
 * declarativo ele é silenciosamente ignorado — vira dead code que dá falsa
 * sensação de robustez. Use o EnhancedErrorBoundary global (src/main.tsx).
 *
 * Allowlist:
 *   - arquivos que usem `createBrowserRouter`/`createMemoryRouter`/`RouterProvider`
 *     (data router de fato) — `errorElement` é válido.
 *   - linha anotada com `// route-error-allow: <razão>`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const IGNORE_DIR = new Set(["node_modules", "dist", "build", "__tests__"]);
const IGNORE_FILE_SUFFIX = [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"];

const RE_ERROR_ELEMENT = /\berrorElement\s*=\s*\{/;
const RE_DATA_ROUTER = /\b(createBrowserRouter|createMemoryRouter|RouterProvider|createHashRouter)\b/;
const RE_ALLOW = /\/\/\s*route-error-allow\s*:\s*\S+/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIR.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const violations = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (IGNORE_FILE_SUFFIX.some((s) => rel.endsWith(s))) continue;
  const src = readFileSync(file, "utf8");
  if (!RE_ERROR_ELEMENT.test(src)) continue;
  if (RE_DATA_ROUTER.test(src)) continue; // data router → permitido
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!RE_ERROR_ELEMENT.test(lines[i])) continue;
    if (RE_ALLOW.test(lines[i])) continue;
    if (i > 0 && RE_ALLOW.test(lines[i - 1])) continue;
    violations.push({ file: rel, line: i + 1, snippet: lines[i].trim() });
  }
}

const asJson = process.argv.includes("--json");
if (asJson) {
  console.log(JSON.stringify({ ok: violations.length === 0, violations }, null, 2));
} else if (violations.length === 0) {
  console.log("✅ route-error-element check passed — nenhum errorElement em <Routes> declarativo.");
} else {
  console.error(`❌ route-error-element check falhou — ${violations.length} ocorrência(s):\n`);
  for (const v of violations) console.error(`  • ${v.file}:${v.line}\n      ${v.snippet}`);
  console.error(
    "\nO prop `errorElement` só funciona em data routers (createBrowserRouter + RouterProvider).\n" +
      "Em <BrowserRouter>+<Routes> declarativo é dead code — o React Router o ignora silenciosamente.\n" +
      "Solução: remova o `errorElement` (o EnhancedErrorBoundary global em src/main.tsx já cobre).\n" +
      "Se intencional (ex.: arquivo de migração futura), anote com // route-error-allow: <razão>.\n",
  );
}
process.exit(violations.length === 0 ? 0 : 1);
