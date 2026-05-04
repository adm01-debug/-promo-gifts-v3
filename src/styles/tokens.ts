/**
 * Design Tokens - Orange Premium Design System
 * Unifies all visual constants for the project.
 */

export const tokens = {
  colors: {
    primary: "hsl(var(--primary))",
    primaryHover: "hsl(var(--primary-hover))",
    primaryActive: "hsl(var(--primary-active))",
    primaryGlow: "hsl(var(--primary-glow))",
    
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    destructive: "hsl(var(--destructive))",
    info: "hsl(var(--info))",
    
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    surface: "hsl(var(--surface))",
    muted: "hsl(var(--muted))",
    mutedForeground: "hsl(var(--muted-foreground))",
    
    border: "hsl(var(--border))",
    borderStrong: "hsl(var(--border-strong))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
  },
  
  radius: {
    xs: "var(--radius-xs)",
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    full: "var(--radius-full)",
    default: "var(--radius)",
  },
  
  fonts: {
    sans: "var(--font-sans)",
    display: "var(--font-display)",
  },
  
  glass: {
    background: "hsl(var(--glass-background))",
    border: "hsl(var(--glass-border))",
    blur: "var(--glass-blur)",
    shadow: "var(--glass-shadow)",
  },
  
  transitions: {
    duration: {
      fast: "var(--duration-fast)",
      normal: "var(--duration-normal)",
      slow: "var(--duration-slow)",
    },
    timing: {
      out: "var(--ease-out)",
      inOut: "var(--ease-in-out)",
    },
    standard: "var(--transition-standard)",
  },
  
  shadows: {
    soft: "var(--shadow-soft)",
    medium: "var(--shadow-medium)",
    premium: "var(--shadow-premium)",
    premiumHover: "var(--shadow-premium-hover)",
    glow: "var(--shadow-glow)",
    glowFocus: "var(--shadow-glow-focus)",
  },
  
  icons: {
    size: "1.25rem",
    stroke: "1.5",
  }
} as const;

export type DesignTokens = typeof tokens;
