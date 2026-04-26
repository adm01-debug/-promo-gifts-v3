#!/usr/bin/env node
/**
 * Detector estático de violações do padrão Radix `asChild` (e similares como
 * `<Slot>` e `motion(Component)`) que envolvem componentes funcionais
 * próprios sem `forwardRef`.
 *
 * Sinaliza o padrão:
 *
 *   <SomeTrigger asChild>
 *     <MyComponent ... />   // <-- MyComponent é função local sem forwardRef
 *   </SomeTrigger>
 *
 * Heurística:
 *  1. Encontra blocos JSX `<X asChild>...</X>` (X termina em "Trigger" ou é "Slot").
 *  2. Olha o primeiro filho JSX significativo. Se for um identificador que começa
 *     com letra maiúscula (componente), procura sua definição no MESMO arquivo
 *     (export function / const X = / const X: FC =) — se existe e NÃO usa
 *     `forwardRef`, reporta.
 *  3. Componentes importados são ignorados (assumimos que `Button`, `Link`,
 *     componentes shadcn/ui etc. já usam forwardRef corretamente — eles são
 *     auditados em sua própria definição).
 *
 * Allowlist por linha: `// aschild-allow: motivo`
 *
 * Saída: stderr lista violações; exit 1 se houver. Stdout lista resumo.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const TRIGGER_RE = /<([A-Z][A-Za-z0-9_]*)\s+([^>]*?)asChild\b([^>]*)>/g;

/** @type {{file:string,line:number,trigger:string,child:string,reason:string}[]} */
const violations = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      files.push(...(await walk(full)));
    } else if (/\.(tsx|jsx)$/.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

function findLocalComponentDef(source, name) {
  // Procura definição local: function NAME, const NAME =, const NAME: ... =
  const patterns = [
    new RegExp(`function\\s+${name}\\s*[<(]`),
    new RegExp(`const\\s+${name}\\s*[:=]`),
    new RegExp(`let\\s+${name}\\s*[:=]`),
  ];
  for (const re of patterns) {
    const m = re.exec(source);
    if (m) return m.index;
  }
  return -1;
}

function isImportedSymbol(source, name) {
  // import { NAME } from "..."  /  import NAME from "..."
  const re = new RegExp(
    `import\\s+(?:[^;]*\\b${name}\\b[^;]*?)\\s+from\\s+['"][^'"]+['"]`,
    "m",
  );
  return re.test(source);
}

function localUsesForwardRef(source, defIndex, name) {
  // Verifica numa janela ~600 chars após a definição se há forwardRef ou React.forwardRef
  const slice = source.slice(defIndex, defIndex + 800);
  if (/\bforwardRef\s*[<(]/.test(slice)) return true;
  if (/React\.forwardRef\s*[<(]/.test(slice)) return true;
  // Ou padrão: const NAME = forwardRef(...)
  const re = new RegExp(`${name}\\s*=\\s*(?:React\\.)?forwardRef\\s*[<(]`);
  return re.test(source);
}

async function checkFile(file) {
  const source = await fs.readFile(file, "utf8");
  const lines = source.split("\n");

  let m;
  TRIGGER_RE.lastIndex = 0;
  while ((m = TRIGGER_RE.exec(source)) !== null) {
    const trigger = m[1];
    // Filtro: só componentes que terminam em Trigger, ou Slot, ou Label/Action
    // padrões Radix mais comuns que aceitam asChild.
    if (
      !/Trigger$/.test(trigger) &&
      trigger !== "Slot" &&
      !/Action$/.test(trigger) &&
      !/Item$/.test(trigger) &&
      !/Link$/.test(trigger)
    ) {
      // Mantém — qualquer componente com asChild conta. Removendo o filtro acima:
    }

    const startIdx = m.index;
    const lineNum = source.slice(0, startIdx).split("\n").length;
    const lineText = lines[lineNum - 1] ?? "";

    // Allowlist
    const around = lines
      .slice(Math.max(0, lineNum - 2), lineNum + 1)
      .join(" ");
    if (/aschild-allow:/i.test(around)) continue;

    // Encontrar primeiro filho JSX significativo após o `>` do trigger
    const afterOpen = source.indexOf(">", startIdx) + 1;
    const closeIdx = source.indexOf(`</${trigger}>`, afterOpen);
    if (closeIdx === -1) continue;
    const inner = source.slice(afterOpen, closeIdx);

    // Pula whitespace/comments/expressões de texto até achar `<Identifier`
    const childMatch = /<\s*([A-Za-z][A-Za-z0-9_.]*)/.exec(inner);
    if (!childMatch) continue;
    const child = childMatch[1];

    // Ignora elementos HTML nativos (lowercase) e componentes "namespace.X"
    if (/^[a-z]/.test(child)) continue;
    if (child.includes(".")) continue; // motion.div, Foo.Bar — fora de escopo aqui

    // Whitelist: componentes conhecidos do design system com forwardRef
    const KNOWN_FORWARDREF = new Set([
      "Button", "Link", "Input", "Textarea", "Label", "Slot",
      "NavLink", "Badge", "Avatar", "Card",
    ]);
    if (KNOWN_FORWARDREF.has(child)) continue;

    // Se o filho é importado de outro lugar, não auditamos aqui
    if (isImportedSymbol(source, child)) continue;

    // Se o filho está definido localmente, verificar forwardRef
    const defIdx = findLocalComponentDef(source, child);
    if (defIdx === -1) continue; // não local nem importado óbvio — pula

    if (!localUsesForwardRef(source, defIdx, child)) {
      violations.push({
        file: path.relative(ROOT, file),
        line: lineNum,
        trigger,
        child,
        reason: `<${trigger} asChild> envolve componente local '${child}' sem forwardRef`,
      });
    }
  }
}

async function main() {
  const files = await walk(SRC);
  await Promise.all(files.map(checkFile));

  if (violations.length === 0) {
    console.log(
      `✓ asChild/forwardRef checker: nenhum padrão problemático encontrado (${files.length} arquivos varridos).`,
    );
    process.exit(0);
  }

  console.error(
    `\n✗ asChild/forwardRef checker: ${violations.length} violação(ões) encontrada(s):\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.reason}`);
  }
  console.error(
    `\nCorreção: envolva o componente filho com forwardRef, ou adicione um wrapper que aplique o ref.`,
  );
  console.error(
    `Allowlist (caso seja intencional): adicione comentário '// aschild-allow: motivo' na linha acima.`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("Erro inesperado no checker:", err);
  process.exit(2);
});
