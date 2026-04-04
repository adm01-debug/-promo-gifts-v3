// =====================================================
// THEME PRESETS SYSTEM
// =====================================================

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  colors: [string, string, string]; // 3 preview swatches
  tokens: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export interface ThemeConfig {
  presetId: string;
  radius: number; // px
  mode: 'light' | 'dark' | 'auto';
  customTokens?: Record<string, string>;
}

const DEFAULT_LIGHT_BASE: Record<string, string> = {
  '--background': '220 14% 96%',
  '--foreground': '222 25% 10%',
  '--card': '0 0% 100%',
  '--card-foreground': '222 25% 10%',
  '--card-elevated': '0 0% 100%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '222 25% 10%',
  '--secondary': '220 14% 92%',
  '--secondary-foreground': '222 25% 18%',
  '--muted': '220 14% 90%',
  '--muted-foreground': '220 12% 46%',
  '--accent': '220 14% 92%',
  '--accent-foreground': '222 25% 13%',
  '--border': '220 14% 86%',
  '--input': '220 14% 90%',
  '--surface': '220 14% 98%',
  '--surface-hover': '220 14% 95%',
  '--text-secondary': '220 12% 42%',
  '--divider': '220 14% 86%',
  '--sidebar-background': '220 14% 98%',
  '--sidebar-foreground': '222 25% 10%',
  '--sidebar-accent': '220 14% 93%',
  '--sidebar-accent-foreground': '222 25% 13%',
  '--sidebar-border': '220 14% 90%',
};

const DEFAULT_DARK_BASE: Record<string, string> = {
  '--background': '225 20% 4%',
  '--foreground': '210 40% 98%',
  '--card': '225 18% 8%',
  '--card-foreground': '210 40% 98%',
  '--card-elevated': '225 16% 11%',
  '--popover': '225 18% 8%',
  '--popover-foreground': '210 40% 98%',
  '--secondary': '225 16% 13%',
  '--secondary-foreground': '210 40% 92%',
  '--muted': '225 14% 16%',
  '--muted-foreground': '215 20% 75%',
  '--accent': '225 16% 13%',
  '--accent-foreground': '210 40% 98%',
  '--border': '225 12% 16%',
  '--input': '225 16% 11%',
  '--surface': '225 18% 9%',
  '--surface-hover': '225 16% 12%',
  '--text-secondary': '215 20% 72%',
  '--divider': '225 14% 18%',
  '--sidebar-background': '225 20% 5%',
  '--sidebar-foreground': '210 40% 98%',
  '--sidebar-accent': '225 16% 12%',
  '--sidebar-accent-foreground': '210 40% 98%',
  '--sidebar-border': '225 14% 12%',
};

function makePrimaryTokens(hue: number, sat: number, light: number) {
  return {
    '--primary': `${hue} ${sat}% ${light}%`,
    '--primary-hover': `${hue} ${sat}% ${light - 5}%`,
    '--primary-active': `${hue} ${sat}% ${light - 10}%`,
    '--primary-glow': `${hue} ${sat}% ${light + 10}%`,
    '--primary-foreground': '0 0% 100%',
    '--ring': `${hue} ${sat}% ${light}%`,
    '--interactive': `${hue} ${sat}% ${light}%`,
    '--orange': `${hue} ${sat}% ${light}%`,
    '--orange-hover': `${hue} ${sat}% ${light - 5}%`,
    '--orange-active': `${hue} ${sat}% ${light - 10}%`,
    '--orange-glow': `${hue} ${sat}% ${light + 10}%`,
    '--orange-foreground': '0 0% 100%',
    '--sidebar-primary': `${hue} ${sat}% ${light}%`,
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-ring': `${hue} ${sat}% ${light}%`,
    '--chart-1': `${hue} ${sat}% ${light}%`,
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Padrão',
    description: 'Roxo vibrante original',
    emoji: '💜',
    colors: ['hsl(280, 70%, 65%)', 'hsl(25, 95%, 55%)', 'hsl(340, 75%, 55%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, ...makePrimaryTokens(25, 95, 53) },
      dark: { ...DEFAULT_DARK_BASE, ...makePrimaryTokens(24, 100, 50) },
    },
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    description: 'Azul profissional',
    emoji: '💼',
    colors: ['hsl(217, 91%, 40%)', 'hsl(215, 85%, 55%)', 'hsl(210, 90%, 60%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, ...makePrimaryTokens(217, 91, 50) },
      dark: { ...DEFAULT_DARK_BASE, ...makePrimaryTokens(215, 85, 55) },
    },
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    description: 'Verde sofisticado',
    emoji: '💚',
    colors: ['hsl(152, 76%, 40%)', 'hsl(160, 65%, 55%)', 'hsl(170, 70%, 50%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, ...makePrimaryTokens(152, 76, 40) },
      dark: {
        ...DEFAULT_DARK_BASE,
        '--background': '160 20% 4%', '--card': '160 18% 8%', '--card-elevated': '160 16% 11%',
        '--popover': '160 18% 8%', '--secondary': '160 16% 13%', '--muted': '160 14% 16%',
        '--accent': '160 16% 13%', '--border': '160 12% 16%', '--input': '160 16% 11%',
        '--surface': '160 18% 9%', '--surface-hover': '160 16% 12%', '--divider': '160 14% 18%',
        '--sidebar-background': '160 20% 5%', '--sidebar-accent': '160 16% 12%', '--sidebar-border': '160 14% 12%',
        ...makePrimaryTokens(150, 70, 45),
      },
    },
  },
  {
    id: 'sunset',
    name: 'Pôr do Sol',
    description: 'Quente e acolhedor',
    emoji: '🌅',
    colors: ['hsl(25, 95%, 55%)', 'hsl(35, 90%, 60%)', 'hsl(45, 95%, 55%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, '--background': '30 20% 96%', ...makePrimaryTokens(35, 95, 50) },
      dark: {
        ...DEFAULT_DARK_BASE,
        '--background': '20 20% 4%', '--card': '20 18% 8%', '--card-elevated': '20 16% 11%',
        '--popover': '20 18% 8%', '--secondary': '20 16% 13%', '--muted': '20 14% 16%',
        '--accent': '20 16% 13%', '--border': '20 12% 16%', '--input': '20 16% 11%',
        '--surface': '20 18% 9%', '--surface-hover': '20 16% 12%', '--divider': '20 14% 18%',
        '--sidebar-background': '20 20% 5%', '--sidebar-accent': '20 16% 12%', '--sidebar-border': '20 14% 12%',
        ...makePrimaryTokens(30, 90, 52),
      },
    },
  },
  {
    id: 'rose',
    name: 'Rosé',
    description: 'Elegante e moderno',
    emoji: '✨',
    colors: ['hsl(340, 75%, 50%)', 'hsl(350, 70%, 60%)', 'hsl(0, 80%, 65%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, ...makePrimaryTokens(340, 75, 55) },
      dark: {
        ...DEFAULT_DARK_BASE,
        '--background': '340 15% 4%', '--card': '340 14% 8%', '--card-elevated': '340 12% 11%',
        '--popover': '340 14% 8%', '--secondary': '340 12% 13%', '--muted': '340 10% 16%',
        '--accent': '340 12% 13%', '--border': '340 10% 16%', '--input': '340 12% 11%',
        '--surface': '340 14% 9%', '--surface-hover': '340 12% 12%', '--divider': '340 10% 18%',
        '--sidebar-background': '340 15% 5%', '--sidebar-accent': '340 12% 12%', '--sidebar-border': '340 10% 12%',
        ...makePrimaryTokens(338, 70, 58),
      },
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean e neutro',
    emoji: '🌑',
    colors: ['hsl(220, 15%, 40%)', 'hsl(220, 10%, 55%)', 'hsl(220, 12%, 65%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, ...makePrimaryTokens(220, 10, 50), '--primary-foreground': '0 0% 100%' },
      dark: { ...DEFAULT_DARK_BASE, ...makePrimaryTokens(220, 12, 55) },
    },
  },
  {
    id: 'oceano',
    name: 'Oceano',
    description: 'Azul profundo',
    emoji: '🌊',
    colors: ['hsl(210, 85%, 40%)', 'hsl(200, 80%, 50%)', 'hsl(195, 85%, 55%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, ...makePrimaryTokens(200, 85, 45) },
      dark: {
        ...DEFAULT_DARK_BASE,
        '--background': '205 25% 4%', '--card': '205 20% 8%', '--card-elevated': '205 18% 11%',
        '--popover': '205 20% 8%', '--secondary': '205 18% 13%', '--muted': '205 16% 16%',
        '--accent': '205 18% 13%', '--border': '205 14% 16%', '--input': '205 18% 11%',
        '--surface': '205 20% 9%', '--surface-hover': '205 18% 12%', '--divider': '205 16% 18%',
        '--sidebar-background': '205 25% 5%', '--sidebar-accent': '205 18% 12%', '--sidebar-border': '205 16% 12%',
        ...makePrimaryTokens(198, 80, 50),
      },
    },
  },
  {
    id: 'ambar',
    name: 'Âmbar',
    description: 'Dourado e premium',
    emoji: '✨',
    colors: ['hsl(30, 85%, 45%)', 'hsl(40, 90%, 55%)', 'hsl(45, 93%, 60%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, ...makePrimaryTokens(45, 93, 47), '--primary-foreground': '40 20% 10%' },
      dark: {
        ...DEFAULT_DARK_BASE,
        '--background': '40 20% 4%', '--card': '40 18% 8%', '--card-elevated': '40 16% 11%',
        '--popover': '40 18% 8%', '--secondary': '40 16% 13%', '--muted': '40 14% 16%',
        '--accent': '40 16% 13%', '--border': '40 12% 16%', '--input': '40 16% 11%',
        '--surface': '40 18% 9%', '--surface-hover': '40 16% 12%', '--divider': '40 14% 18%',
        '--sidebar-background': '40 20% 5%', '--sidebar-accent': '40 16% 12%', '--sidebar-border': '40 14% 12%',
        ...makePrimaryTokens(42, 90, 50), '--primary-foreground': '40 20% 10%',
      },
    },
  },
  {
    id: 'cyber',
    name: 'Cyber',
    description: 'Neon futurista',
    emoji: '💜',
    colors: ['hsl(280, 85%, 55%)', 'hsl(270, 25%, 5%)', 'hsl(285, 80%, 58%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, ...makePrimaryTokens(280, 85, 55) },
      dark: {
        ...DEFAULT_DARK_BASE,
        '--background': '270 25% 4%', '--card': '270 20% 8%', '--card-elevated': '270 18% 11%',
        '--popover': '270 20% 8%', '--secondary': '270 18% 13%', '--muted': '270 16% 16%',
        '--accent': '270 18% 13%', '--border': '270 14% 16%', '--input': '270 18% 11%',
        '--surface': '270 20% 9%', '--surface-hover': '270 18% 12%', '--divider': '270 16% 18%',
        '--sidebar-background': '270 25% 5%', '--sidebar-accent': '270 18% 12%', '--sidebar-border': '270 16% 12%',
        ...makePrimaryTokens(285, 80, 58),
      },
    },
  },
  {
    id: 'lavanda',
    name: 'Lavanda',
    description: 'Suave e calmante',
    emoji: '🟪',
    colors: ['hsl(260, 60%, 65%)', 'hsl(255, 20%, 6%)', 'hsl(258, 55%, 68%)'],
    tokens: {
      light: { ...DEFAULT_LIGHT_BASE, ...makePrimaryTokens(260, 60, 65) },
      dark: {
        ...DEFAULT_DARK_BASE,
        '--background': '255 20% 4%', '--card': '255 18% 8%', '--card-elevated': '255 16% 11%',
        '--popover': '255 18% 8%', '--secondary': '255 16% 13%', '--muted': '255 14% 16%',
        '--accent': '255 16% 13%', '--border': '255 12% 16%', '--input': '255 16% 11%',
        '--surface': '255 18% 9%', '--surface-hover': '255 16% 12%', '--divider': '255 14% 18%',
        '--sidebar-background': '255 20% 5%', '--sidebar-accent': '255 16% 12%', '--sidebar-border': '255 14% 12%',
        ...makePrimaryTokens(258, 55, 68),
      },
    },
  },
];

// =====================================================
// STORAGE & APPLICATION
// =====================================================

const STORAGE_KEY = 'gifts-store-theme-config';

export function getDefaultConfig(): ThemeConfig {
  return {
    presetId: 'default',
    radius: 12,
    mode: 'auto',
  };
}

export function loadThemeConfig(): ThemeConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...getDefaultConfig(), ...JSON.parse(stored) };
  } catch {}
  return getDefaultConfig();
}

export function saveThemeConfig(config: ThemeConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function applyThemePreset(presetId: string, mode: 'light' | 'dark'): void {
  const preset = THEME_PRESETS.find(p => p.id === presetId);
  if (!preset) return;

  const root = document.documentElement;
  const tokens = preset.tokens[mode];

  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function applyRadius(px: number): void {
  document.documentElement.style.setProperty('--radius', `${px / 16}rem`);
}

export function clearThemeOverrides(): void {
  const root = document.documentElement;
  // Get all preset tokens from default to know which to clear
  const allKeys = new Set<string>();
  THEME_PRESETS.forEach(p => {
    Object.keys(p.tokens.light).forEach(k => allKeys.add(k));
    Object.keys(p.tokens.dark).forEach(k => allKeys.add(k));
  });
  allKeys.forEach(key => root.style.removeProperty(key));
  root.style.removeProperty('--radius');
}

export function exportThemeConfig(config: ThemeConfig): string {
  return JSON.stringify(config, null, 2);
}

export function importThemeConfig(json: string): ThemeConfig | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.presetId && typeof parsed.radius === 'number') {
      return parsed as ThemeConfig;
    }
  } catch {}
  return null;
}
