#!/usr/bin/env node
/**
 * Auditoria mais ampla: para cada `<X asChild> <Child .../> </X>`, se Child
 * é importado de um caminho relativo ('@/...' ou './'), abre o arquivo de
 * origem e verifica se a definição de Child usa forwardRef. Se NÃO usar e
 * NÃO for um wrapper trivial sobre elemento DOM (ex.: retorna apenas <a>,
 * <div>, <button>...) então é um candidato real à warning.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".git"].includes(e.name)) continue;
      out.push(...(await walk(full)));
    } else if (/\.(tsx|jsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

function parseImports(source) {
  // Map<localName, sourcePath>
  const map = new Map();
  const re = /import\s+(?:type\s+)?(?:(\*\s+as\s+\w+)|(\w+)?(?:\s*,\s*)?(?:\{([^}]+)\})?)\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source))) {
    const def = m[2];
    const named = m[3];
    const src = m[4];
    if (def) map.set(def, src);
    if (named) {
      named.split(",").forEach((part) => {
        const cleaned = part.trim().replace(/\s+as\s+/, " as ");
        const [orig, alias] = cleaned.split(/\s+as\s+/).map((s) => s.trim());
        const local = alias ?? orig;
        if (local && /^[A-Z]/.test(local)) map.set(local, src);
      });
    }
  }
  return map;
}

function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../"))
    base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const candidate = base + ext;
    return candidate; // we'll just try first one and check existence later
  }
  return null;
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function resolveRealImport(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../"))
    base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const c = base + ext;
    if (await exists(c)) return c;
  }
  return null;
}

function definesWithForwardRef(source, name) {
  const patterns = [
    new RegExp(`${name}\\s*=\\s*(?:React\\.)?forwardRef\\s*[<(]`),
    new RegExp(`export\\s+const\\s+${name}\\s*=\\s*(?:React\\.)?forwardRef\\s*[<(]`),
  ];
  return patterns.some((re) => re.test(source));
}

function findDef(source, name) {
  const patterns = [
    new RegExp(`function\\s+${name}\\s*[<(]`),
    new RegExp(`const\\s+${name}\\s*[:=]`),
    new RegExp(`export\\s+function\\s+${name}\\s*[<(]`),
    new RegExp(`export\\s+const\\s+${name}\\s*[:=]`),
  ];
  for (const re of patterns) {
    const m = re.exec(source);
    if (m) return m.index;
  }
  return -1;
}

const TRIGGER_RE = /<([A-Z][A-Za-z0-9_]*)\s+([^>]*?)asChild\b([^>]*?)>/g;
const KNOWN_OK = new Set([
  "Button","Link","Input","Textarea","Label","Slot","NavLink","Badge",
  "Avatar","Card","SidebarMenuButton","SidebarMenuSubButton",
]);

const violations = [];

async function checkFile(file) {
  const source = await fs.readFile(file, "utf8");
  const lines = source.split("\n");
  const imports = parseImports(source);

  let m;
  TRIGGER_RE.lastIndex = 0;
  while ((m = TRIGGER_RE.exec(source))) {
    const trigger = m[1];
    const startIdx = m.index;
    const lineNum = source.slice(0, startIdx).split("\n").length;
    const around = lines.slice(Math.max(0, lineNum - 2), lineNum + 1).join(" ");
    if (/aschild-allow:/i.test(around)) continue;

    const afterOpen = source.indexOf(">", startIdx) + 1;
    const closeIdx = source.indexOf(`</${trigger}>`, afterOpen);
    if (closeIdx === -1) continue;
    const inner = source.slice(afterOpen, closeIdx);
    const childMatch = /<\s*([A-Za-z][A-Za-z0-9_.]*)/.exec(inner);
    if (!childMatch) continue;
    const child = childMatch[1];
    if (/^[a-z]/.test(child)) continue;
    if (child.includes(".")) continue;
    if (KNOWN_OK.has(child)) continue;

    const importSpec = imports.get(child);
    if (!importSpec) continue; // não importado — coberto pelo outro checker
    const resolved = await resolveRealImport(file, importSpec);
    if (!resolved) continue; // bibliotecas externas — assume OK

    const childSource = await fs.readFile(resolved, "utf8");
    if (definesWithForwardRef(childSource, child)) continue;
    const defIdx = findDef(childSource, child);
    if (defIdx === -1) continue;

    // Verifica se é wrapper trivial sobre DOM (heurística: corpo contém return <tag) — ainda assim
    // sem forwardRef o ref não chega ao DOM, então conta como violação.
    violations.push({
      file: path.relative(ROOT, file),
      line: lineNum,
      trigger,
      child,
      from: path.relative(ROOT, resolved),
    });
  }
}

const files = await walk(SRC);
await Promise.all(files.map(checkFile));

if (violations.length === 0) {
  console.log(`✓ aschild-imports checker: nenhum problema encontrado (${files.length} arquivos).`);
  process.exit(0);
}

console.error(`\n✗ ${violations.length} caso(s) potencialmente problemáticos:\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  <${v.trigger} asChild> envolve <${v.child}/> definido em ${v.from} sem forwardRef`);
}
process.exit(1);
