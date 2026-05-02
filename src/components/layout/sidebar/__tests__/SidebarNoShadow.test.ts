/**
 * Regressão visual estática: garante que o sidebar de navegação não usa
 * sombras/brilhos (`shadow-glow`, `shadow-soft`, `shadow-md/lg/xl/2xl`)
 * em estados base, hover ou active — em light OU dark mode (as classes
 * são as mesmas; tokens de cor mudam, mas o "shadow" não deve existir).
 *
 * `shadow-glow-focus` é PERMITIDO porque aparece apenas em `:focus-visible`
 * e é necessário para acessibilidade de teclado.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const FILES = [
  "src/components/layout/sidebar/SidebarNavGroup.tsx",
  "src/components/layout/sidebar/SidebarBrandHeader.tsx",
  "src/components/ui/sidebar.tsx",
];

// Casa shadow-glow, shadow-soft, shadow-md/lg/xl/2xl, shadow-primary/...
// Exclui shadow-glow-focus (a11y focus-visible) e shadow-none.
// Também valida que dark:shadow não é usado para evitar glows específicos em dark mode.
const FORBIDDEN = /\b(?:dark:)?shadow-(?:glow(?!-focus)\b|soft\b|md\b|lg\b|xl\b|2xl\b|primary\b)/g;

describe("Sidebar — sem sombras/brilhos em hover/active (light + dark)", () => {
  for (const rel of FILES) {
    it(`${rel} não contém classes de sombra proibidas`, () => {
      const content = readFileSync(resolve(process.cwd(), rel), "utf8");
      const matches = content.match(FORBIDDEN) ?? [];
      expect(
        matches,
        `Encontradas classes de sombra proibidas em ${rel}: ${matches.join(", ")}`,
      ).toEqual([]);
    });
  }

  it("hover:shadow-* (com blur/glow) não é usado em itens do sidebar", () => {
    // Permite shadow-[0_0_0_Npx_...] (border-as-shadow, sem desfoque) e shadow-none.
    const BAD_HOVER = /hover:shadow-(?!none|\[0_0_0_)/;
    for (const rel of FILES) {
      const content = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(content, `hover:shadow-* (glow) em ${rel}`).not.toMatch(BAD_HOVER);
    }
  });

  it("data-[active=true]:shadow-* não é usado", () => {
    for (const rel of FILES) {
      const content = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(content, `active:shadow em ${rel}`).not.toMatch(
        /data-\[active=true\]:shadow-(?!none)/,
      );
    }
  });
});
