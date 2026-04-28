import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { loadThemeConfig, applyThemePreset, applyRadius } from '@/lib/theme-presets';

/**
 * ThemeInitializer — mounted globally in App.tsx, OUTSIDE routes.
 * Restores the saved skin on every page load and when light/dark mode changes.
 * Per-preset font / radius (Opera GX) são aplicados dentro de applyThemePreset.
 */
export function ThemeInitializer() {
  const { actualTheme } = useTheme();

  useEffect(() => {
    const cfg = loadThemeConfig();
    applyThemePreset(cfg.presetId, actualTheme);
    applyRadius(cfg.radius);
  }, [actualTheme]);

  return null;
}
