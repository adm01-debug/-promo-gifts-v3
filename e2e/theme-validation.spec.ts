import { test, expect, Page } from '@playwright/test';
import { THEME_PRESETS, DEFAULT_FONT_SANS, DEFAULT_FONT_DISPLAY } from '../src/lib/theme-presets';
import * as fs from 'fs';
import * as path from 'path';

// Configurações do teste
const ROUTES = ['/', '/auth']; // Adicione outras rotas públicas relevantes
const MODES: ('light' | 'dark')[] = ['light', 'dark'];
const REPORT_FILE = path.join(process.cwd(), 'playwright-report', 'theme-validation-data.json');

interface ValidationFailure {
  preset: string;
  mode: string;
  route: string;
  type: 'contrast' | 'typography' | 'visual';
  details: string;
}

const failures: ValidationFailure[] = [];

// Função auxiliar para calcular contraste no browser
async function checkContrast(page: Page, presetName: string, mode: string, route: string) {
  const contrastResult = await page.evaluate(() => {
    function getLuminance(rgb: string) {
      const parts = rgb.match(/\d+/g);
      if (!parts) return 0;
      const [r, g, b] = parts.map(c => {
        const s = parseInt(c) / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    const body = document.body;
    const style = window.getComputedStyle(body);
    const bg = style.backgroundColor;
    const fg = style.color;

    const l1 = getLuminance(bg);
    const l2 = getLuminance(fg);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    const ratio = (brightest + 0.05) / (darkest + 0.05);

    return { ratio, bg, fg };
  });

  if (contrastResult.ratio < 4.5) {
    failures.push({
      preset: presetName,
      mode,
      route,
      type: 'contrast',
      details: `Baixo contraste: ${contrastResult.ratio.toFixed(2)}:1 (Background: ${contrastResult.bg}, Foreground: ${contrastResult.fg})`,
    });
  }
}

async function checkTypography(page: Page, presetName: string, mode: string, route: string) {
  const typographyResult = await page.evaluate(() => {
    const body = document.body;
    const style = window.getComputedStyle(body);
    const fontSans = style.getPropertyValue('--font-sans').trim();
    const fontDisplay = style.getPropertyValue('--font-display').trim();
    return { fontSans, fontDisplay };
  });

  // O valor computado pode variar dependendo de como o browser resolve, 
  // mas verificamos se contém as fontes esperadas.
  const expectedSans = "Plus Jakarta Sans";
  const expectedDisplay = "Outfit";

  if (!typographyResult.fontSans.includes(expectedSans) || !typographyResult.fontDisplay.includes(expectedDisplay)) {
    failures.push({
      preset: presetName,
      mode,
      route,
      type: 'typography',
      details: `Tipografia inconsistente. Esperado Sans: ${expectedSans}, Display: ${expectedDisplay}. Encontrado Sans: ${typographyResult.fontSans}, Display: ${typographyResult.fontDisplay}`,
    });
  }
}

test.describe('Theme Consistency & Visual Regression', () => {
  test.afterAll(async () => {
    // Salva o relatório parcial em JSON para ser processado depois
    const reportDir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(REPORT_FILE, JSON.stringify(failures, null, 2));
  });

  for (const preset of THEME_PRESETS) {
    for (const mode of MODES) {
      test(`Validation for Preset: ${preset.name} [${mode.toUpperCase()}]`, async ({ page }) => {
        // Aplicar preset via localStorage e recarregar
        await page.addInitScript(({ presetId, mode }) => {
          localStorage.setItem('gifts-store-theme-config', JSON.stringify({
            presetId,
            radius: 14,
            mode: 'auto' // O modo será controlado pela classe no body ou prefer-color-scheme
          }));
          localStorage.setItem('gifts-store-theme', mode);
        }, { presetId: preset.id, mode });

        for (const route of ROUTES) {
          await page.goto(route);
          await page.waitForLoadState('networkidle');

          // 1. Validar Contraste
          await checkContrast(page, preset.name, mode, route);

          // 2. Validar Tipografia
          await checkTypography(page, preset.name, mode, route);

          // 3. Screenshot Visual Regression (Apenas para uma rota principal para não explodir o tempo)
          if (route === '/') {
            await expect(page).toHaveScreenshot(`${preset.id}-${mode}-home.png`, {
              fullPage: true,
              mask: [page.locator('[data-testid="dynamic-content"]')], // Mascarar conteúdo dinâmico se houver
            });
          }
        }
      });
    }
  }
});
