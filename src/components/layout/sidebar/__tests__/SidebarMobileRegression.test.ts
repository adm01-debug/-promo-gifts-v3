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
          const isSheetBase = /SheetContent/.test(line) && /shadow-lg/.test(line); // Base shadow do Sheet

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

  it("Garante ausência de 'ring-orange' fora de focus-visible", () => {
    const files = ["src/components/layout/SidebarReorganized.tsx", "src/components/mobile/SmartMobileNav.tsx"];
    files.forEach(file => {
      const content = readFileSync(resolve(process.cwd(), file), "utf8");
      const matches = content.match(/\bring-orange(?:\/\d+)?\b/g) ?? [];
      
      if (matches.length > 0) {
        const lines = content.split("\n");
        lines.forEach(line => {
          if (line.includes("ring-orange") && !line.includes("focus-visible:") && !line.trim().startsWith("//")) {
            throw new Error(`Ring laranja detectado sem focus-visible em ${file}: ${line.trim()}`);
          }
        });
      }
    });
  });

  it("Garante que o estado hover/active usa apenas background sólido", () => {
    const files = ["src/components/layout/SidebarReorganized.tsx", "src/components/mobile/SmartMobileNav.tsx"];
    files.forEach(file => {
      const content = readFileSync(resolve(process.cwd(), file), "utf8");
      const hoverOrangeShadow = /hover:shadow-orange/.test(content);
      const hoverOrangeBorder = /hover:border-orange/.test(content);
      const activeOrangeShadow = /active:shadow-orange/.test(content);
      const activeOrangeBorder = /active:border-orange/.test(content);
      
      expect(hoverOrangeShadow, `Hover shadow laranja detectado em ${file}`).toBe(false);
      expect(hoverOrangeBorder, `Hover border laranja detectado em ${file}`).toBe(false);
      expect(activeOrangeShadow, `Active shadow laranja detectado em ${file}`).toBe(false);
      expect(activeOrangeBorder, `Active border laranja detectado em ${file}`).toBe(false);
    });
  });

  it("Garante ausência de glow laranja no menu colapsado e durante transições", () => {
    const file = "src/components/layout/sidebar/SidebarNavGroup.tsx";
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    const hasForbiddenShadows = /shadow-orange|shadow-glow/.test(content);
    expect(hasForbiddenShadows, "SidebarNavGroup não deve conter sombras laranjas ou de brilho").toBe(false);
    
    const lines = content.split("\n");
    let inCollapsedLogic = false;
    lines.forEach((line) => {
      if (line.includes("isCollapsed")) inCollapsedLogic = true;
      if (inCollapsedLogic && line.includes("border-orange") && !line.includes("focus-visible:")) {
        throw new Error(`Border laranja detectado no contexto colapsado: ${line.trim()}`);
      }
      });
    });
  });

  it("Garante que o fundo do item ativo não excede opacidade discreta", () => {
    const file = "src/components/layout/sidebar/SidebarNavGroup.tsx";
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    
    // Verifica se a opacidade do bg-orange ativo é <= 0.04
    const matches = content.match(/bg-orange\/\[([\d.]+)\]/g);
    if (matches) {
      matches.forEach(m => {
        const opacity = parseFloat(m.match(/[\d.]+/)![0]);
        expect(opacity, `Opacidade de fundo ${m} é muito alta`).toBeLessThanOrEqual(0.04);
      });
    }
  });

  it("Garante que o indicador lateral (before) tem altura calibrada", () => {
    const file = "src/components/layout/sidebar/SidebarNavGroup.tsx";
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    
    // Verifica se estamos usando o novo padrão de top/bottom em vez de h-5 fixo para o indicador principal
    const hasCalibratedIndicator = /before:top-\[20%\] before:bottom-\[20%\]/.test(content);
    expect(hasCalibratedIndicator, "O indicador lateral deve usar posicionamento relativo (top/bottom) para ser mais discreto").toBe(true);
  });
});
