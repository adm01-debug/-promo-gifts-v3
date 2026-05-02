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

// Recursive directory scan for design regressions
const ALL_SRC_FILES = (function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  files.forEach(file => {
    const name = resolve(dir, file);
    if (statSync(name).isDirectory()) {
      if (!name.includes('node_modules') && !name.includes('.git')) {
        getAllFiles(name, fileList);
      }
    } else if (/\.(tsx|ts|css)$/.test(name)) {
      fileList.push(name);
    }
  });
  return fileList;
})(resolve(process.cwd(), "src"));

// Regex for forbidden glow patterns
const FORBIDDEN_GLOW = /\b(?:shadow-glow|text-shadow|ambient-glow|drop-shadow-\[.*?primary.*?\]|drop-shadow-\[.*?orange.*?\])\b/g;

describe("Global UI Regression — Zero Glow Policy", () => {
  ALL_SRC_FILES.forEach(file => {
    // Skip policy definition and the test itself
    if (file.includes('design-policy.ts') || file.includes('SidebarMobileRegression.test.ts')) return;

    it(`should not contain orange glow or halos in ${file.replace(process.cwd(), '')}`, () => {
      const content = readFileSync(file, "utf8");
      
      // Allow focus-visible:ring as it's neutralized in CSS but classes might persist
      // However, we want to flag hardcoded drop-shadows
      const matches = content.match(FORBIDDEN_GLOW);
      
      if (matches) {
        // Double check if it's a comment
        const lines = content.split('\n');
        const violations = lines.filter(line => 
          FORBIDDEN_GLOW.test(line) && 
          !line.trim().startsWith("//") && 
          !line.trim().startsWith("*") &&
          !line.includes("NO_ORANGE_GLOW_POLICY")
        );
        
        expect(violations, `Found glow effects in ${file}:\n${violations.join('\n')}`).toHaveLength(0);
      }
    });
  });
});
... keep existing code
