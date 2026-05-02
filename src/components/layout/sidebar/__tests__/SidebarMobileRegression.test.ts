/**
 * Regressão para o Sidebar em modo Mobile (Sheet/Drawer/Aside):
 * Garante que não existem bordas ou sombras alaranjadas (glow/halo)
 * em estados hover/active, especialmente em Dark Mode.
 * 
 * O design deve ser 100% plano, usando apenas cores de fundo sólidas
 * e o indicador lateral vertical para o estado ativo.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const SIDEBAR_FILES = [
  "src/components/layout/SidebarReorganized.tsx",
  "src/components/layout/sidebar/SidebarNavGroup.tsx",
  "src/components/layout/sidebar/SidebarBrandHeader.tsx",
  "src/components/ui/sidebar.tsx",
];

// Regex para detectar bordas ou sombras laranjas/primárias que causam "glow"
// Exclui focus-visible:ring (necessário para a11y)
const ORANGE_GLOW_CLASSES = /\b(?:hover:|active:|data-\[active=true\]:)?(?:shadow|border)-(?:orange|primary)(?:\/\d+)?\b/g;

describe("Sidebar Mobile — Regressão de Border/Shadow Laranja (Dark Mode Safe)", () => {
  for (const file of SIDEBAR_FILES) {
    it(`${file} não deve ter bordas ou sombras laranjas em hover/active`, () => {
      const content = readFileSync(resolve(process.cwd(), file), "utf8");
      
      // Procurar por classes que usam border-orange ou shadow-orange fora de focus-visible
      const lines = content.split("\n");
      const violations: string[] = [];

      lines.forEach((line, index) => {
        const matches = line.match(ORANGE_GLOW_CLASSES);
        if (matches) {
          // Filtrar matches que estão dentro de um contexto de focus-visible ou ring
          // (permitimos ring-primary em focus-visible)
          const isA11yFocus = /focus-visible:/.test(line);
          const isSafeIndicator = /before:bg-orange/.test(line); // O indicador lateral é seguro
          
          matches.forEach(match => {
            // Se for border-orange ou shadow-orange e não for focus-visible ou indicador lateral
            if (!isA11yFocus && !isSafeIndicator) {
              violations.push(`Linha ${index + 1}: ${match}`);
            }
          });
        }
      });

      expect(violations, `Violações de design (glow laranja detectado) em ${file}`).toHaveLength(0);
    });
  }

  it("Garante ausência de 'ring-orange' fora de focus-visible (mobile aside)", () => {
    const file = "src/components/layout/SidebarReorganized.tsx";
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    const matches = content.match(/\bring-orange(?:\/\d+)?\b/g) ?? [];
    
    // Se houver ring-orange, deve obrigatoriamente ter focus-visible:
    if (matches.length > 0) {
      const lines = content.split("\n");
      lines.forEach(line => {
        if (line.includes("ring-orange") && !line.includes("focus-visible:")) {
          throw new Error(`Ring laranja detectado sem focus-visible em ${file}: ${line.trim()}`);
        }
      });
    }
  });

  it("Garante que o estado hover no Mobile/Aside usa apenas background neutro ou orange/10 sem glow", () => {
    const file = "src/components/layout/SidebarReorganized.tsx";
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    
    // Checar botões de toggle e fechar no mobile
    const hoverOrangeShadow = /hover:shadow-orange/.test(content);
    const hoverOrangeBorder = /hover:border-orange/.test(content);
    
    expect(hoverOrangeShadow, "Mobile Sidebar não deve ter shadow-orange no hover").toBe(false);
    expect(hoverOrangeBorder, "Mobile Sidebar não deve ter border-orange no hover").toBe(false);
  });
});
