import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { loadThemeConfig, applyThemePreset, applyRadius, applyFontPair } from '@/lib/theme-presets';

/**
 * ThemeInitializer — mounted globally in App.tsx, OUTSIDE routes.
 * Restores the saved skin on every page load and when light/dark mode changes.
 */
export function ThemeInitializer() {
  const { actualTheme } = useTheme();

  useEffect(() => {
    const cfg = loadThemeConfig();
    applyThemePreset(cfg.presetId, actualTheme);
    applyRadius(cfg.radius);
    applyFontPair(cfg.fontPairId);
  }, [actualTheme]);

  return null;
}
