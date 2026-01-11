import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, Palette, Check } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type ColorBlindType = 
  | "none" 
  | "protanopia" 
  | "deuteranopia" 
  | "tritanopia" 
  | "achromatopsia"
  | "high-contrast";

export interface ColorBlindModeProps {
  className?: string;
}

export interface UseColorBlindModeReturn {
  mode: ColorBlindType;
  setMode: (mode: ColorBlindType) => void;
  isActive: boolean;
}

// ============================================================================
// COLOR BLIND MODE CONTEXT
// ============================================================================

const ColorBlindContext = React.createContext<UseColorBlindModeReturn | null>(null);

export function useColorBlindMode(): UseColorBlindModeReturn {
  const context = React.useContext(ColorBlindContext);
  if (!context) {
    throw new Error("useColorBlindMode must be used within ColorBlindProvider");
  }
  return context;
}

// ============================================================================
// COLOR BLIND PROVIDER
// ============================================================================

export interface ColorBlindProviderProps {
  children: React.ReactNode;
  defaultMode?: ColorBlindType;
  storageKey?: string;
}

export function ColorBlindProvider({
  children,
  defaultMode = "none",
  storageKey = "color-blind-mode",
}: ColorBlindProviderProps) {
  const [mode, setModeState] = React.useState<ColorBlindType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      return (stored as ColorBlindType) || defaultMode;
    }
    return defaultMode;
  });

  const setMode = React.useCallback((newMode: ColorBlindType) => {
    setModeState(newMode);
    localStorage.setItem(storageKey, newMode);
  }, [storageKey]);

  // Apply CSS filter to document
  React.useEffect(() => {
    const root = document.documentElement;
    
    // Remove all color blind classes
    root.classList.remove(
      "cb-protanopia",
      "cb-deuteranopia",
      "cb-tritanopia",
      "cb-achromatopsia",
      "cb-high-contrast"
    );

    // Add new class if not "none"
    if (mode !== "none") {
      root.classList.add(`cb-${mode}`);
    }
  }, [mode]);

  const isActive = mode !== "none";

  return (
    <ColorBlindContext.Provider value={{ mode, setMode, isActive }}>
      {children}
    </ColorBlindContext.Provider>
  );
}

// ============================================================================
// COLOR BLIND CSS STYLES (add to index.css)
// ============================================================================

export const colorBlindStyles = `
/* Protanopia (Red-Blind) */
.cb-protanopia {
  filter: url('#protanopia-filter');
}

/* Deuteranopia (Green-Blind) */
.cb-deuteranopia {
  filter: url('#deuteranopia-filter');
}

/* Tritanopia (Blue-Blind) */
.cb-tritanopia {
  filter: url('#tritanopia-filter');
}

/* Achromatopsia (Total Color Blindness) */
.cb-achromatopsia {
  filter: grayscale(100%);
}

/* High Contrast */
.cb-high-contrast {
  filter: contrast(1.5) saturate(1.2);
}

/* Enhanced focus states for high contrast */
.cb-high-contrast *:focus-visible {
  outline: 3px solid currentColor !important;
  outline-offset: 2px !important;
}

/* Pattern overlays for charts and graphs */
.cb-pattern-stripes {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    currentColor 2px,
    currentColor 4px
  );
}

.cb-pattern-dots {
  background-image: radial-gradient(
    currentColor 1px,
    transparent 1px
  );
  background-size: 4px 4px;
}

.cb-pattern-crosshatch {
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      currentColor 2px,
      currentColor 3px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      currentColor 2px,
      currentColor 3px
    );
}
`;

// ============================================================================
// SVG FILTERS FOR COLOR BLINDNESS SIMULATION
// ============================================================================

export function ColorBlindFilters() {
  return (
    <svg className="absolute w-0 h-0" aria-hidden="true">
      <defs>
        {/* Protanopia Filter */}
        <filter id="protanopia-filter">
          <feColorMatrix
            type="matrix"
            values="0.567, 0.433, 0,     0, 0
                    0.558, 0.442, 0,     0, 0
                    0,     0.242, 0.758, 0, 0
                    0,     0,     0,     1, 0"
          />
        </filter>

        {/* Deuteranopia Filter */}
        <filter id="deuteranopia-filter">
          <feColorMatrix
            type="matrix"
            values="0.625, 0.375, 0,   0, 0
                    0.7,   0.3,   0,   0, 0
                    0,     0.3,   0.7, 0, 0
                    0,     0,     0,   1, 0"
          />
        </filter>

        {/* Tritanopia Filter */}
        <filter id="tritanopia-filter">
          <feColorMatrix
            type="matrix"
            values="0.95, 0.05,  0,     0, 0
                    0,    0.433, 0.567, 0, 0
                    0,    0.475, 0.525, 0, 0
                    0,    0,     0,     1, 0"
          />
        </filter>
      </defs>
    </svg>
  );
}

// ============================================================================
// COLOR BLIND MODE SELECTOR
// ============================================================================

const colorBlindOptions: Array<{
  value: ColorBlindType;
  label: string;
  description: string;
}> = [
  {
    value: "none",
    label: "Normal",
    description: "Visão de cores padrão",
  },
  {
    value: "protanopia",
    label: "Protanopia",
    description: "Dificuldade com vermelho",
  },
  {
    value: "deuteranopia",
    label: "Deuteranopia",
    description: "Dificuldade com verde",
  },
  {
    value: "tritanopia",
    label: "Tritanopia",
    description: "Dificuldade com azul",
  },
  {
    value: "achromatopsia",
    label: "Acromatopsia",
    description: "Escala de cinza completa",
  },
  {
    value: "high-contrast",
    label: "Alto Contraste",
    description: "Cores mais intensas",
  },
];

export function ColorBlindModeSelector({ className }: ColorBlindModeProps) {
  const { mode, setMode, isActive } = useColorBlindMode();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2",
            isActive && "border-primary text-primary",
            className
          )}
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Acessibilidade Visual</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Modo de Cores
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Adapte as cores para melhor visualização
            </p>
          </div>

          <div className="space-y-2">
            {colorBlindOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setMode(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                  "hover:bg-muted",
                  mode === option.value && "bg-primary/10 border border-primary/30"
                )}
              >
                <div>
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {mode === option.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Preview Colors */}
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Prévia das cores:</p>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded bg-red-500" title="Vermelho" />
              <div className="w-8 h-8 rounded bg-green-500" title="Verde" />
              <div className="w-8 h-8 rounded bg-blue-500" title="Azul" />
              <div className="w-8 h-8 rounded bg-yellow-500" title="Amarelo" />
              <div className="w-8 h-8 rounded bg-purple-500" title="Roxo" />
              <div className="w-8 h-8 rounded bg-orange-500" title="Laranja" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// ACCESSIBLE COLOR INDICATOR
// ============================================================================

export interface AccessibleColorIndicatorProps {
  color: string;
  label: string;
  pattern?: "stripes" | "dots" | "crosshatch";
  className?: string;
}

export function AccessibleColorIndicator({
  color,
  label,
  pattern,
  className,
}: AccessibleColorIndicatorProps) {
  const patternClass = pattern ? `cb-pattern-${pattern}` : "";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn("w-4 h-4 rounded-sm border", patternClass)}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
