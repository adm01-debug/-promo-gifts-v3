// =====================================================
// THEME PRESETS SYSTEM — buildPreset() factory
// Covers ALL CSS vars from index.css for DEEP theming
// =====================================================

export interface ThemeModeColors {
  // === SUPERFÍCIES CORE ===
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  'card-elevated': string;
  popover: string;
  'popover-foreground': string;

  // === CORES PRIMÁRIAS ===
  primary: string;
  'primary-foreground': string;
  'primary-hover': string;
  'primary-active': string;
  'primary-glow': string;

  // === CORES SECUNDÁRIAS ===
  secondary: string;
  'secondary-foreground': string;

  // === MUTED ===
  muted: string;
  'muted-foreground': string;

  // === ACCENT ===
  accent: string;
  'accent-foreground': string;

  // === BORDAS & INPUTS ===
  border: string;
  input: string;
  ring: string;

  // === SEMANTIC ===
  surface: string;
  'surface-hover': string;
  'text-secondary': string;
  interactive: string;
  divider: string;

  // === ORANGE (maps to primary) ===
  orange: string;
  'orange-hover': string;
  'orange-active': string;
  'orange-glow': string;
  'orange-foreground': string;

  // === SIDEBAR ===
  'sidebar-background': string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
  'sidebar-ring': string;

  // === ELEVAÇÃO ===
  elevated: string;
  'elevated-hover': string;

  // === GLASS MORPHISM (ALL variants) ===
  'glass-bg': string;
  'glass-bg-strong': string;
  'glass-bg-subtle': string;
  'glass-border': string;
  'glass-border-strong': string;
  'glass-shadow': string;

  // === GRADIENTES (ALL used in index.css) ===
  'gradient-primary': string;
  'gradient-secondary': string;
  'gradient-success': string;
  'gradient-surface': string;
  'gradient-divider': string;
  'gradient-hero': string;
  'gradient-novelty': string;

  // === SOMBRAS GLOW (ALL) ===
  'shadow-glow': string;
  'shadow-glow-primary': string;
  'shadow-glow-secondary': string;
  'shadow-glow-success': string;
  'shadow-glow-warning': string;

  // === SOMBRAS DEPTH ===
  'shadow-lg': string;
  'shadow-xl': string;
  'shadow-header': string;

  // === CHART ===
  'chart-1': string;
}

export const CSS_VARS_TO_APPLY: (keyof ThemeModeColors)[] = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'card-elevated',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'primary-hover',
  'primary-active',
  'primary-glow',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'border',
  'input',
  'ring',
  'surface',
  'surface-hover',
  'text-secondary',
  'interactive',
  'divider',
  'orange',
  'orange-hover',
  'orange-active',
  'orange-glow',
  'orange-foreground',
  'sidebar-background',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'elevated',
  'elevated-hover',
  'glass-bg',
  'glass-bg-strong',
  'glass-bg-subtle',
  'glass-border',
  'glass-border-strong',
  'glass-shadow',
  'gradient-primary',
  'gradient-secondary',
  'gradient-success',
  'gradient-surface',
  'gradient-divider',
  'gradient-hero',
  'gradient-novelty',
  'shadow-glow',
  'shadow-glow-primary',
  'shadow-glow-secondary',
  'shadow-glow-success',
  'shadow-glow-warning',
  'shadow-lg',
  'shadow-xl',
  'shadow-header',
  'chart-1',
];

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  swatches: [string, string, string, string];
  light: ThemeModeColors;
  dark: ThemeModeColors;
  /** Optional category badge (e.g., "GX" for Opera GX inspired). */
  category?: 'classic' | 'gx';
}

export interface ThemeConfig {
  presetId: string;
  radius: number;
  mode: 'light' | 'dark' | 'auto';
  fontPairId: string;
}

// =====================================================
// BUILD PRESET FACTORY — generates ALL 80+ CSS vars
// =====================================================

interface PresetParams {
  id: string;
  name: string;
  description: string;
  emoji: string;
  h: number; // Primary hue
  s: number; // Primary saturation
  l: number; // Primary lightness
  gh: number; // Glow hue
  sh: number; // Secondary hue
  ss: number; // Secondary saturation
  sl: number; // Secondary lightness
}

function buildPreset(p: PresetParams): ThemePreset {
  const { id, name, description, emoji, h, s, l, gh, sh, ss, sl } = p;

  const primary = `${h} ${s}% ${l}%`;
  const primaryHover = `${h} ${s}% ${Math.max(l - 5, 5)}%`;
  const primaryActive = `${h} ${s}% ${Math.max(l - 10, 5)}%`;
  const primaryGlow = `${gh} ${s}% ${Math.min(l + 10, 95)}%`;
  const secondary = `${sh} ${ss}% ${sl}%`;

  // Success color stays green-ish but tinted towards the skin's hue
  const successH = 142;
  const successS = 71;
  const successL = 45;

  // Warning stays amber-ish
  const warningH = 38;
  const warningS = 92;
  const warningL = 50;

  const light: ThemeModeColors = {
    background: `${h} 20% 97%`,
    foreground: '222 25% 10%',
    card: '0 0% 100%',
    'card-foreground': '222 25% 10%',
    'card-elevated': '0 0% 100%',
    popover: '0 0% 100%',
    'popover-foreground': '222 25% 10%',
    primary,
    'primary-foreground': '0 0% 100%',
    'primary-hover': primaryHover,
    'primary-active': primaryActive,
    'primary-glow': primaryGlow,
    secondary: `${h} 14% 92%`,
    'secondary-foreground': '222 25% 18%',
    muted: `${h} 14% 90%`,
    'muted-foreground': `${h} 12% 46%`,
    accent: `${h} 14% 92%`,
    'accent-foreground': '222 25% 13%',
    border: `${h} 14% 86%`,
    input: `${h} 14% 90%`,
    ring: primary,
    surface: `${h} 14% 98%`,
    'surface-hover': `${h} 14% 95%`,
    'text-secondary': `${h} 12% 42%`,
    interactive: primary,
    divider: `${h} 14% 86%`,
    orange: primary,
    'orange-hover': primaryHover,
    'orange-active': primaryActive,
    'orange-glow': primaryGlow,
    'orange-foreground': '0 0% 100%',
    'sidebar-background': `${h} 14% 98%`,
    'sidebar-foreground': '222 25% 10%',
    'sidebar-primary': primary,
    'sidebar-primary-foreground': '0 0% 100%',
    'sidebar-accent': `${h} 14% 93%`,
    'sidebar-accent-foreground': '222 25% 13%',
    'sidebar-border': `${h} 14% 90%`,
    'sidebar-ring': primary,
    elevated: '0 0% 100%',
    'elevated-hover': `${h} 14% 97%`,
    // Glass
    'glass-bg': '0 0% 100% / 0.8',
    'glass-bg-strong': '0 0% 100% / 0.9',
    'glass-bg-subtle': '0 0% 100% / 0.6',
    'glass-border': `${h} 14% 86% / 0.4`,
    'glass-border-strong': `${h} 14% 86% / 0.6`,
    'glass-shadow': `0 4px 30px hsl(222 25% 10% / 0.06)`,
    // Gradients
    'gradient-primary': `linear-gradient(135deg, hsl(${primary}), hsl(${primaryGlow}))`,
    'gradient-secondary': `linear-gradient(135deg, hsl(${secondary}), hsl(${sh} ${ss}% ${Math.min(sl + 10, 95)}%))`,
    'gradient-success': `linear-gradient(135deg, hsl(${successH} ${successS}% ${successL}%), hsl(${successH + 10} ${successS}% ${successL + 10}%))`,
    'gradient-surface': `linear-gradient(180deg, hsl(0 0% 100%), hsl(${h} 14% 96%))`,
    'gradient-divider': `linear-gradient(90deg, transparent, hsl(${h} 14% 86% / 0.5), transparent)`,
    'gradient-hero': `linear-gradient(135deg, hsl(${primary} / 0.08) 0%, hsl(${primaryGlow} / 0.04) 100%)`,
    'gradient-novelty': `linear-gradient(135deg, hsl(${successH} ${successS}% ${successL}%), hsl(${successH + 10} 76% 40%))`,
    // Shadows
    'shadow-glow': `0 0 20px hsl(${primary} / 0.2)`,
    'shadow-glow-primary': `0 0 20px hsl(${primary} / 0.2)`,
    'shadow-glow-secondary': `0 0 20px hsl(${secondary} / 0.3)`,
    'shadow-glow-success': `0 0 20px hsl(${successH} ${successS}% ${successL}% / 0.2)`,
    'shadow-glow-warning': `0 0 20px hsl(${warningH} ${warningS}% ${warningL}% / 0.25)`,
    'shadow-lg': `0 10px 15px -3px hsl(222 25% 10% / 0.08), 0 4px 6px -4px hsl(222 25% 10% / 0.05)`,
    'shadow-xl': `0 20px 25px -5px hsl(222 25% 10% / 0.1), 0 8px 10px -6px hsl(222 25% 10% / 0.06)`,
    'shadow-header': `0 1px 3px hsl(222 25% 10% / 0.06), 0 1px 2px hsl(222 25% 10% / 0.04)`,
    'chart-1': primary,
  };

  const dark: ThemeModeColors = {
    background: '240 6% 6%',
    foreground: '210 40% 98%',
    card: '240 5% 10%',
    'card-foreground': '210 40% 98%',
    'card-elevated': '240 5% 13%',
    popover: '240 5% 10%',
    'popover-foreground': '210 40% 98%',
    primary,
    'primary-foreground': '0 0% 100%',
    'primary-hover': primaryHover,
    'primary-active': primaryActive,
    'primary-glow': primaryGlow,
    secondary: '240 5% 16%',
    'secondary-foreground': '210 40% 92%',
    muted: '240 4% 18%',
    'muted-foreground': '215 20% 75%',
    accent: '240 5% 16%',
    'accent-foreground': '210 40% 98%',
    border: '240 4% 18%',
    input: '240 5% 14%',
    ring: primary,
    surface: '240 5% 9%',
    'surface-hover': '240 5% 12%',
    'text-secondary': '215 20% 72%',
    interactive: primary,
    divider: '240 4% 20%',
    orange: primary,
    'orange-hover': primaryHover,
    'orange-active': primaryActive,
    'orange-glow': primaryGlow,
    'orange-foreground': '0 0% 100%',
    'sidebar-background': '240 6% 5%',
    'sidebar-foreground': '210 40% 98%',
    'sidebar-primary': primary,
    'sidebar-primary-foreground': '0 0% 100%',
    'sidebar-accent': '240 5% 12%',
    'sidebar-accent-foreground': '210 40% 98%',
    'sidebar-border': '240 4% 14%',
    'sidebar-ring': primary,
    elevated: '240 5% 12%',
    'elevated-hover': '240 5% 15%',
    // Glass — dark mode with primary tint
    'glass-bg': '240 6% 8% / 0.85',
    'glass-bg-strong': '240 8% 6% / 0.92',
    'glass-bg-subtle': '240 5% 10% / 0.65',
    'glass-border': `${h} 30% 30% / 0.15`,
    'glass-border-strong': `${h} 40% 35% / 0.25`,
    'glass-shadow': `0 4px 30px hsl(225 20% 2% / 0.4), 0 0 40px hsl(${primary} / 0.03)`,
    // Gradients — all tinted with primary
    'gradient-primary': `linear-gradient(135deg, hsl(${primary}), hsl(${primaryGlow}))`,
    'gradient-secondary': `linear-gradient(135deg, hsl(${secondary}), hsl(${sh} ${ss}% ${Math.min(sl + 10, 95)}%))`,
    'gradient-success': `linear-gradient(135deg, hsl(${successH} 76% 48%), hsl(${successH + 10} 80% 42%))`,
    'gradient-surface': `linear-gradient(180deg, hsl(240 5% 10%), hsl(240 6% 6%))`,
    'gradient-divider': `linear-gradient(90deg, transparent, hsl(${h} 50% 40% / 0.15), transparent)`,
    'gradient-hero': `linear-gradient(135deg, hsl(${primary} / 0.12) 0%, hsl(${gh} 60% 50% / 0.06) 50%, hsl(${primary} / 0.08) 100%)`,
    'gradient-novelty': `linear-gradient(135deg, hsl(${successH} 76% 48%), hsl(${successH + 10} 80% 42%))`,
    // Shadows — dramatic glow with primary color
    'shadow-glow': `0 0 30px hsl(${primary} / 0.4), 0 0 60px hsl(${primary} / 0.15)`,
    'shadow-glow-primary': `0 0 30px hsl(${primary} / 0.4), 0 0 60px hsl(${primary} / 0.15)`,
    'shadow-glow-secondary': `0 0 25px hsl(${secondary} / 0.5)`,
    'shadow-glow-success': `0 0 25px hsl(${successH} 76% 48% / 0.35)`,
    'shadow-glow-warning': `0 0 25px hsl(${warningH} 95% 52% / 0.4)`,
    'shadow-lg': `0 10px 15px -3px hsl(225 20% 2% / 0.7), 0 4px 6px -4px hsl(225 20% 2% / 0.5), 0 0 20px hsl(${primary} / 0.04)`,
    'shadow-xl': `0 20px 25px -5px hsl(225 20% 2% / 0.8), 0 8px 10px -6px hsl(225 20% 2% / 0.6), 0 0 30px hsl(${primary} / 0.06)`,
    'shadow-header': `0 1px 3px hsl(225 20% 2% / 0.7), 0 0 20px hsl(${primary} / 0.03), inset 0 1px 0 hsl(225 15% 18% / 0.3)`,
    'chart-1': primary,
  };

  return {
    id,
    name,
    description,
    emoji,
    swatches: [
      `hsl(${h} ${s}% ${l}%)`,
      `hsl(${sh} ${ss}% ${sl}%)`,
      `hsl(${gh} ${Math.max(s - 5, 0)}% ${Math.min(l + 6, 100)}%)`,
      `hsl(${h} ${Math.round(s * 0.5)}% ${Math.min(l + 15, 100)}%)`,
    ],
    light,
    dark,
  };
}

// =====================================================
// 10 PRESETS + DIVERSITY
// =====================================================

const diversityBase = buildPreset({
  id: 'diversity',
  name: 'Diversity',
  description: 'Orgulho e diversidade',
  emoji: '🏳️‍🌈',
  h: 0,
  s: 85,
  l: 55,
  gh: 280,
  sh: 160,
  ss: 70,
  sl: 45,
});

const rainbowGrad =
  'linear-gradient(135deg, hsl(0 85% 55%), hsl(30 90% 55%), hsl(55 90% 50%), hsl(130 70% 45%), hsl(210 80% 55%), hsl(280 80% 58%))';

const diversityPreset: ThemePreset = {
  ...diversityBase,
  swatches: ['hsl(0 85% 55%)', 'hsl(55 90% 50%)', 'hsl(130 70% 45%)', 'hsl(280 80% 58%)'],
  light: {
    ...diversityBase.light,
    'gradient-primary': rainbowGrad,
    'gradient-secondary': rainbowGrad,
    'gradient-hero': `linear-gradient(135deg, hsl(0 85% 55% / 0.08), hsl(130 70% 45% / 0.06), hsl(280 80% 58% / 0.08))`,
    'shadow-glow': '0 0 20px hsl(280 80% 58% / 0.2)',
    'shadow-glow-primary': '0 0 20px hsl(280 80% 58% / 0.25)',
    'shadow-glow-secondary': '0 0 20px hsl(130 70% 45% / 0.25)',
  },
  dark: {
    ...diversityBase.dark,
    'gradient-primary': rainbowGrad,
    'gradient-secondary': rainbowGrad,
    'gradient-hero': `linear-gradient(135deg, hsl(0 85% 55% / 0.12), hsl(130 70% 45% / 0.08), hsl(280 80% 58% / 0.12))`,
    'shadow-glow': '0 0 30px hsl(280 80% 58% / 0.4), 0 0 60px hsl(130 70% 45% / 0.15)',
    'shadow-glow-primary': '0 0 30px hsl(280 80% 58% / 0.3)',
    'shadow-glow-secondary': '0 0 25px hsl(130 70% 45% / 0.3)',
  },
};

// =====================================================
// OPERA GX-INSPIRED PRESETS — pure black, neon glow
// =====================================================
//
// Estes presets recriam o visual icônico do navegador Opera GX:
//   • backgrounds quase pretos no modo escuro
//   • bordas/sombras com brilho neon
//   • cores primárias vibrantes (Pink/Purple/Cyan/Green/Red/Yellow)
//   • gradientes com energia "gamer"
//
// O builder chama buildPreset() e sobrescreve os tokens-chave
// para acentuar o efeito glow + dark deep-black da skin.

interface GxPresetParams extends PresetParams {
  gxName: string;
  gxEmoji: string;
}

function buildGxPreset(p: GxPresetParams): ThemePreset {
  const base = buildPreset(p);
  const { h, s, l, gh } = p;
  const primary = `${h} ${s}% ${l}%`;
  const primaryGlow = `${gh} ${s}% ${Math.min(l + 10, 95)}%`;

  return {
    ...base,
    id: `gx-${p.id}`,
    name: `GX ${p.gxName}`,
    description: `Opera GX — ${p.description}`,
    emoji: p.gxEmoji,
    category: 'gx',
    swatches: [
      `hsl(${primary})`,
      `hsl(${primaryGlow})`,
      `hsl(${gh} ${s}% ${Math.min(l + 18, 95)}%)`,
      `hsl(0 0% 8%)`,
    ],
    light: {
      ...base.light,
      // Light mode: clean canvas with neon accents
      'card-elevated': `${h} 30% 99%`,
      'shadow-glow': `0 0 24px hsl(${primary} / 0.35), 0 0 8px hsl(${primary} / 0.5)`,
      'shadow-glow-primary': `0 0 24px hsl(${primary} / 0.35), 0 0 8px hsl(${primary} / 0.5)`,
      'gradient-hero': `linear-gradient(135deg, hsl(${primary} / 0.10) 0%, hsl(${gh} 90% 60% / 0.06) 100%)`,
    },
    dark: {
      ...base.dark,
      // Pure-black Opera GX dark canvas
      background: '0 0% 4%',
      foreground: '0 0% 98%',
      card: '0 0% 7%',
      'card-elevated': '0 0% 10%',
      popover: '0 0% 7%',
      'popover-foreground': '0 0% 98%',
      surface: '0 0% 5%',
      'surface-hover': '0 0% 9%',
      muted: '0 0% 12%',
      'muted-foreground': `${h} 10% 75%`,
      secondary: '0 0% 14%',
      'secondary-foreground': '0 0% 95%',
      accent: '0 0% 14%',
      'accent-foreground': '0 0% 98%',
      input: '0 0% 8%',
      border: `${h} 30% 18%`,
      divider: `${h} 30% 16%`,
      'sidebar-background': '0 0% 3%',
      'sidebar-foreground': '0 0% 98%',
      'sidebar-accent': '0 0% 9%',
      'sidebar-accent-foreground': '0 0% 98%',
      'sidebar-border': `${h} 30% 14%`,
      elevated: '0 0% 9%',
      'elevated-hover': '0 0% 12%',
      // Glass with strong primary tint
      'glass-bg': `${h} 30% 6% / 0.82`,
      'glass-bg-strong': `${h} 30% 4% / 0.92`,
      'glass-bg-subtle': `${h} 30% 8% / 0.6`,
      'glass-border': `${h} 70% 50% / 0.25`,
      'glass-border-strong': `${h} 80% 55% / 0.4`,
      'glass-shadow': `0 4px 30px hsl(0 0% 0% / 0.6), 0 0 40px hsl(${primary} / 0.08)`,
      // Strong neon glow signature
      'shadow-glow': `0 0 32px hsl(${primary} / 0.55), 0 0 64px hsl(${primary} / 0.25)`,
      'shadow-glow-primary': `0 0 32px hsl(${primary} / 0.6), 0 0 64px hsl(${primary} / 0.3)`,
      'shadow-glow-secondary': `0 0 28px hsl(${primary} / 0.4)`,
      'shadow-lg': `0 10px 15px -3px hsl(0 0% 0% / 0.8), 0 4px 6px -4px hsl(0 0% 0% / 0.6), 0 0 24px hsl(${primary} / 0.06)`,
      'shadow-xl': `0 20px 25px -5px hsl(0 0% 0% / 0.9), 0 8px 10px -6px hsl(0 0% 0% / 0.7), 0 0 40px hsl(${primary} / 0.10)`,
      'shadow-header': `0 1px 3px hsl(0 0% 0% / 0.8), 0 0 24px hsl(${primary} / 0.05), inset 0 1px 0 hsl(${h} 40% 20% / 0.4)`,
      // Gradients with Opera GX energy
      'gradient-hero': `linear-gradient(135deg, hsl(${primary} / 0.18) 0%, hsl(${gh} 80% 60% / 0.1) 50%, hsl(${primary} / 0.14) 100%)`,
      'gradient-divider': `linear-gradient(90deg, transparent, hsl(${primary} / 0.3), transparent)`,
      'gradient-surface': `linear-gradient(180deg, hsl(0 0% 7%), hsl(0 0% 4%))`,
    },
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  // === CLASSIC PRESETS (mantidas) ===
  {
    ...buildPreset({
      id: 'corporate',
      name: 'Padrão',
      emoji: '💼',
      h: 221,
      s: 83,
      l: 53,
      gh: 230,
      sh: 215,
      ss: 70,
      sl: 55,
      description: 'Azul profissional',
    }),
    category: 'classic',
  },
  {
    ...buildPreset({
      id: 'purpure',
      name: 'Púrpure',
      emoji: '💜',
      h: 254,
      s: 92,
      l: 62,
      gh: 260,
      sh: 260,
      ss: 90,
      sl: 67,
      description: 'Roxo vibrante',
    }),
    category: 'classic',
  },
  {
    ...buildPreset({
      id: 'emerald',
      name: 'Esmeralda',
      emoji: '💎',
      h: 160,
      s: 84,
      l: 45,
      gh: 170,
      sh: 145,
      ss: 70,
      sl: 50,
      description: 'Verde sofisticado',
    }),
    category: 'classic',
  },
  {
    ...buildPreset({
      id: 'sunset',
      name: 'Pôr do Sol',
      emoji: '🌅',
      h: 25,
      s: 95,
      l: 53,
      gh: 35,
      sh: 15,
      ss: 80,
      sl: 50,
      description: 'Quente e acolhedor',
    }),
    category: 'classic',
  },
  {
    ...buildPreset({
      id: 'rose',
      name: 'Rosé',
      emoji: '🌸',
      h: 346,
      s: 77,
      l: 50,
      gh: 355,
      sh: 330,
      ss: 70,
      sl: 55,
      description: 'Elegante e moderno',
    }),
    category: 'classic',
  },
  {
    ...buildPreset({
      id: 'minimal',
      name: 'Minimal',
      emoji: '⚪',
      h: 220,
      s: 15,
      l: 50,
      gh: 220,
      sh: 220,
      ss: 10,
      sl: 45,
      description: 'Clean e neutro',
    }),
    category: 'classic',
  },
  {
    ...buildPreset({
      id: 'ocean',
      name: 'Oceano',
      emoji: '🌊',
      h: 200,
      s: 85,
      l: 55,
      gh: 210,
      sh: 190,
      ss: 75,
      sl: 50,
      description: 'Azul profundo',
    }),
    category: 'classic',
  },
  {
    ...buildPreset({
      id: 'amber',
      name: 'Âmbar',
      emoji: '✨',
      h: 38,
      s: 92,
      l: 50,
      gh: 45,
      sh: 30,
      ss: 80,
      sl: 55,
      description: 'Dourado e premium',
    }),
    category: 'classic',
  },
  {
    ...buildPreset({
      id: 'cyber',
      name: 'Cyber',
      emoji: '🤖',
      h: 180,
      s: 100,
      l: 50,
      gh: 300,
      sh: 320,
      ss: 100,
      sl: 60,
      description: 'Neon futurista',
    }),
    category: 'classic',
  },
  { ...diversityPreset, category: 'classic' },

  // === OPERA GX SKINS (novas) ===
  buildGxPreset({
    id: 'pink',
    gxName: 'Pink',
    gxEmoji: '💖',
    h: 330,
    s: 100,
    l: 58,
    gh: 320,
    sh: 300,
    ss: 90,
    sl: 60,
    description: 'Hot pink neon, a skin clássica',
  }),
  buildGxPreset({
    id: 'purple',
    gxName: 'Purple',
    gxEmoji: '🟣',
    h: 265,
    s: 90,
    l: 65,
    gh: 275,
    sh: 280,
    ss: 85,
    sl: 65,
    description: 'Roxo real com brilho gamer',
  }),
  buildGxPreset({
    id: 'cyan',
    gxName: 'Cyan',
    gxEmoji: '💠',
    h: 185,
    s: 100,
    l: 50,
    gh: 195,
    sh: 200,
    ss: 90,
    sl: 55,
    description: 'Azul ciano elétrico',
  }),
  buildGxPreset({
    id: 'green',
    gxName: 'Matrix',
    gxEmoji: '🟢',
    h: 140,
    s: 85,
    l: 50,
    gh: 150,
    sh: 130,
    ss: 70,
    sl: 45,
    description: 'Verde Matrix, modo hacker',
  }),
  buildGxPreset({
    id: 'red',
    gxName: 'Red',
    gxEmoji: '🔴',
    h: 0,
    s: 95,
    l: 58,
    gh: 10,
    sh: 350,
    ss: 85,
    sl: 55,
    description: 'Vermelho intenso',
  }),
  buildGxPreset({
    id: 'yellow',
    gxName: 'Yellow',
    gxEmoji: '🟡',
    h: 48,
    s: 100,
    l: 55,
    gh: 58,
    sh: 38,
    ss: 95,
    sl: 55,
    description: 'Amarelo elétrico',
  }),
  buildGxPreset({
    id: 'mono',
    gxName: 'Mono',
    gxEmoji: '⬛',
    h: 0,
    s: 0,
    l: 92,
    gh: 0,
    sh: 0,
    ss: 0,
    sl: 70,
    description: 'Mono cromático Opera GX',
  }),
];

// =====================================================
// FONT PAIRS — fontes preservadas + opções Opera GX gamer
// =====================================================

export interface FontPair {
  id: string;
  name: string;
  description: string;
  emoji: string;
  /** Valor pronto para `--font-sans` */
  sans: string;
  /** Valor pronto para `--font-display` */
  display: string;
  /** URL Google Fonts a ser injetada dinamicamente. Vazio para o par padrão (já em index.html). */
  googleUrl?: string;
}

export const FONT_PAIRS: FontPair[] = [
  {
    id: 'default',
    name: 'Padrão',
    description: 'Plus Jakarta Sans + Outfit',
    emoji: '✨',
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    display: "'Outfit', system-ui, sans-serif",
  },
  {
    id: 'gx-sharp',
    name: 'GX Sharp',
    description: 'Rajdhani + Orbitron',
    emoji: '⚡',
    sans: "'Rajdhani', system-ui, sans-serif",
    display: "'Orbitron', system-ui, sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;800;900&family=Rajdhani:wght@400;500;600;700&display=swap',
  },
  {
    id: 'gx-cyber',
    name: 'GX Cyber',
    description: 'Bai Jamjuree + Audiowide',
    emoji: '🤖',
    sans: "'Bai Jamjuree', system-ui, sans-serif",
    display: "'Audiowide', system-ui, sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Audiowide&family=Bai+Jamjuree:wght@400;500;600;700&display=swap',
  },
  {
    id: 'gx-gaming',
    name: 'GX Gaming',
    description: 'Manrope + Russo One',
    emoji: '🎮',
    sans: "'Manrope', system-ui, sans-serif",
    display: "'Russo One', system-ui, sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Russo+One&display=swap',
  },
  {
    id: 'gx-modern',
    name: 'GX Modern',
    description: 'Inter + Space Grotesk',
    emoji: '🔷',
    sans: "'Inter', system-ui, sans-serif",
    display: "'Space Grotesk', system-ui, sans-serif",
    googleUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap',
  },
  {
    id: 'gx-retro',
    name: 'GX Retro',
    description: 'VT323 + Press Start 2P',
    emoji: '👾',
    sans: "'VT323', monospace",
    display: "'Press Start 2P', system-ui, sans-serif",
    googleUrl: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap',
  },
];

// =====================================================
// STORAGE & APPLICATION
// =====================================================

const STORAGE_KEY = 'gifts-store-theme-config';

export function getDefaultConfig(): ThemeConfig {
  return { presetId: 'corporate', radius: 8, mode: 'auto', fontPairId: 'default' };
}

export function loadThemeConfig(): ThemeConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = { ...getDefaultConfig(), ...JSON.parse(stored) };
      if (!THEME_PRESETS.find((p) => p.id === parsed.presetId)) {
        parsed.presetId = 'corporate';
      }
      if (!FONT_PAIRS.find((p) => p.id === parsed.fontPairId)) {
        parsed.fontPairId = 'default';
      }
      return parsed;
    }
  } catch {
    // localStorage indisponível ou JSON inválido: usa defaults
  }
  return getDefaultConfig();
}

export function saveThemeConfig(config: ThemeConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function applyThemePreset(presetId: string, mode: 'light' | 'dark'): void {
  const preset = THEME_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;

  const root = document.documentElement;

  // Enable smooth transition for all elements
  root.classList.add('theme-transitioning');

  const colors = preset[mode];

  CSS_VARS_TO_APPLY.forEach((key) => {
    const value = colors[key];
    if (value !== undefined) {
      root.style.setProperty(`--${key}`, value);
    }
  });

  // Remove transition class after animation completes
  setTimeout(() => root.classList.remove('theme-transitioning'), 500);
}

export function applyRadius(px: number): void {
  document.documentElement.style.setProperty('--radius', `${px / 16}rem`);
}

const FONT_LINK_ID = 'gx-font-pair-link';

/**
 * Aplica o par de fontes — atualiza --font-sans / --font-display
 * e injeta o stylesheet do Google Fonts on-demand quando necessário.
 */
export function applyFontPair(fontPairId: string): void {
  if (typeof document === 'undefined') return;

  const pair = FONT_PAIRS.find((p) => p.id === fontPairId) ?? FONT_PAIRS[0];
  const root = document.documentElement;
  root.style.setProperty('--font-sans', pair.sans);
  root.style.setProperty('--font-display', pair.display);

  const existing = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;

  if (pair.googleUrl) {
    if (existing) {
      if (existing.href !== pair.googleUrl) existing.href = pair.googleUrl;
    } else {
      const link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = pair.googleUrl;
      document.head.appendChild(link);
    }
  } else if (existing) {
    // Voltando ao par padrão (já carregado via index.html)
    existing.remove();
  }
}

export function clearThemeOverrides(): void {
  const root = document.documentElement;
  CSS_VARS_TO_APPLY.forEach((key) => root.style.removeProperty(`--${key}`));
  root.style.removeProperty('--radius');
  root.style.removeProperty('--font-sans');
  root.style.removeProperty('--font-display');
  const existing = document.getElementById(FONT_LINK_ID);
  if (existing) existing.remove();
}

export function exportThemeConfig(config: ThemeConfig): string {
  return JSON.stringify(config, null, 2);
}

export function importThemeConfig(json: string): ThemeConfig | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.presetId && typeof parsed.radius === 'number') {
      // Backfill new fields for backward compatibility with legacy exports
      const merged: ThemeConfig = { ...getDefaultConfig(), ...parsed };
      if (!FONT_PAIRS.find((p) => p.id === merged.fontPairId)) {
        merged.fontPairId = 'default';
      }
      return merged;
    }
  } catch {
    // JSON inválido: import falha silenciosamente
  }
  return null;
}
