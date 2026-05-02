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
  "src/components/mobile/SmartMobileNav.tsx",
  "src/components/ui/sidebar.tsx",
];

// Regex para detectar bordas ou sombras laranjas/primárias que causam "glow"
// Exclui focus-visible:ring (necessário para a11y) e shadow-none
// Regex para detectar QUALQUER sombra (exceto as permitidas para a11y)
const FORBIDDEN_SHADOWS = /\bshadow-(?!none|glow-focus)\w+/g;
// Regex para detectar bordas coloridas que não sejam neutras
const FORBIDDEN_BORDERS = /\bborder-(?:orange|primary)(?:\/\d+)?\b/g;

describe("Sidebar Mobile — Regressão de Design Plano (No Shadows/Glows)", () => {
  for (const file of SIDEBAR_FILES) {
    it(`${file} não deve ter sombras ou bordas coloridas`, () => {
      const content = readFileSync(resolve(process.cwd(), file), "utf8");
      const lines = content.split("\n");
      const violations: string[] = [];

      lines.forEach((line, index) => {
        // Ignorar linhas de comentário ou import
        if (line.trim().startsWith("//") || line.trim().startsWith("import")) return;

        const shadowMatches = line.match(FORBIDDEN_SHADOWS);
        const borderMatches = line.match(FORBIDDEN_BORDERS);

        if (shadowMatches || borderMatches) {
          // Permitir apenas se for focus-visible
          const isA11yFocus = /focus-visible:/.test(line);
          const isSafeIndicator = /before:bg-orange/.test(line);
          const isSheetBase = /SheetContent/.test(line) && /shadow-lg/.test(line); // Base shadow do Sheet (opcional manter)

          if (shadowMatches) {
            shadowMatches.forEach(m => {
              if (!isA11yFocus && !isSheetBase) violations.push(`Linha ${index + 1}: ${m}`);
            });
          }
          if (borderMatches) {
            borderMatches.forEach(m => {
              if (!isA11yFocus && !isSafeIndicator) violations.push(`Linha ${index + 1}: ${m}`);
            });
          }
        }
      });

      expect(violations, `Violações detectadas em ${file}`).toHaveLength(0);
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

  it("Garante ausência de glow laranja no menu colapsado ao alternar estados", () => {
    const file = "src/components/layout/sidebar/SidebarNavGroup.tsx";
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    
    // Proibir sombras laranjas em qualquer estado de interação do NavGroup
    const hasForbiddenShadows = /shadow-orange|shadow-glow/.test(content);
    expect(hasForbiddenShadows, "SidebarNavGroup não deve conter sombras laranjas ou de brilho").toBe(false);
    
    // Verificar se no modo colapsado (isCollapsed) não há aplicação de bordas que simulem glow
    const lines = content.split("\n");
    let inCollapsedLogic = false;
    lines.forEach((line) => {
      if (line.includes("if (isCollapsed)")) inCollapsedLogic = true;
      if (inCollapsedLogic) {
        // No modo colapsado, o NavLink não deve ter bordas laranjas além do indicador lateral (isActive)
        // O indicador lateral usa 'before:bg-orange' que é permitido, mas não deve ter border-orange
        if (line.includes("border-orange")) {
          throw new Error(`Border laranja detectado no modo colapsado: ${line.trim()}`);
        }
      }
    });
  });
});
