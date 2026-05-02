import { describe, it, expect } from 'vitest';
import { THEME_PRESETS } from './theme-presets';

const DEFAULT_FONT_SANS = "'Plus Jakarta Sans', system-ui, sans-serif";
const DEFAULT_FONT_DISPLAY = "'Outfit', system-ui, sans-serif";

describe('Theme Presets Consistency', () => {
  it('should not override default fonts in any preset', () => {
    THEME_PRESETS.forEach(preset => {
      // O preset não deve ter a propriedade 'font' definida se queremos seguir o padrão,
      // ou ela deve ser explicitamente igual aos defaults (embora o plano fosse remover).
      // Se 'font' existir, ela deve ser igual a undefined ou não existir para usar o fallback no applyThemePreset.
      expect(preset.font, `Preset "${preset.name}" (${preset.id}) is overriding the default font stack.`).toBeUndefined();
    });
  });

  it('should have basic color tokens defined in both light and dark modes', () => {
    const requiredTokens = ['primary', 'background', 'foreground', 'card', 'border'];
    
    THEME_PRESETS.forEach(preset => {
      requiredTokens.forEach(token => {
        expect(preset.light[token as keyof typeof preset.light], `Preset "${preset.name}" is missing "${token}" in light mode.`).toBeDefined();
        expect(preset.dark[token as keyof typeof preset.dark], `Preset "${preset.name}" is missing "${token}" in dark mode.`).toBeDefined();
      });
    });
  });

  it('should maintain consistent category types', () => {
    THEME_PRESETS.forEach(preset => {
      expect(['classic', 'gx']).toContain(preset.category);
    });
  });
});
