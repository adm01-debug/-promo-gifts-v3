import { useContext, useEffect } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { loadThemeConfig, applyThemePreset, applyRadius } from '@/lib/theme-presets';

/**
 * ThemeInitializer — mounted globally in App.tsx, OUTSIDE routes.
 * Restores the saved skin on every page load and when light/dark mode changes.
 * Per-preset font / radius (Opera GX) são aplicados dentro de applyThemePreset.
 *
 * Usa `useContext` direto (não `useTheme`) para não quebrar durante HMR
 * caso o contexto temporariamente venha undefined.
 */
export function ThemeInitializer() {
  const ctx = useContext(ThemeContext);
  const actualTheme = ctx?.actualTheme ?? 'light';

  useEffect(() => {
    const cfg = loadThemeConfig();
    applyThemePreset(cfg.presetId, actualTheme);
    applyRadius(cfg.radius);
  }, [actualTheme]);

  return null;
}
