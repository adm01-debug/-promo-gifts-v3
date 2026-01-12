/**
 * Accessibility Features
 * Keyboard navigation, screen reader support, reduce motion
 */

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Accessibility,
  Minus,
  Plus,
  Type,
  Contrast,
  MousePointer,
  Keyboard,
  Pause,
  Play,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  textScale: number;
  screenReader: boolean;
  focusIndicators: boolean;
  keyboardNavigation: boolean;
  pauseAnimations: boolean;
  cursorSize: "default" | "large" | "extra-large";
}

const defaultSettings: AccessibilitySettings = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  textScale: 100,
  screenReader: false,
  focusIndicators: true,
  keyboardNavigation: true,
  pauseAnimations: false,
  cursorSize: "default",
};

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const stored = localStorage.getItem("accessibility-settings");
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
    // Check system preferences
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    return { ...defaultSettings, reduceMotion: prefersReducedMotion };
  });

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Reduce motion
    if (settings.reduceMotion || settings.pauseAnimations) {
      root.style.setProperty("--animation-duration", "0s");
      root.classList.add("reduce-motion");
    } else {
      root.style.removeProperty("--animation-duration");
      root.classList.remove("reduce-motion");
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Text scale
    root.style.fontSize = `${settings.textScale}%`;

    // Large text
    if (settings.largeText) {
      root.classList.add("large-text");
    } else {
      root.classList.remove("large-text");
    }

    // Focus indicators
    if (settings.focusIndicators) {
      root.classList.add("focus-visible");
    } else {
      root.classList.remove("focus-visible");
    }

    // Cursor size
    root.setAttribute("data-cursor-size", settings.cursorSize);

    // Save to localStorage
    localStorage.setItem("accessibility-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(
      key: K,
      value: AccessibilitySettings[K]
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem("accessibility-settings");
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{ settings, updateSetting, resetSettings }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

// Accessibility Panel Component
export function AccessibilityPanel() {
  const { settings, updateSetting, resetSettings } = useAccessibility();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" title="Acessibilidade">
          <Accessibility className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Acessibilidade
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Motion & Animation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Movimento
            </h3>

            <SettingRow
              icon={<Pause className="h-4 w-4" />}
              label="Reduzir movimento"
              description="Desativa animações e transições"
            >
              <Switch
                checked={settings.reduceMotion}
                onCheckedChange={(checked) =>
                  updateSetting("reduceMotion", checked)
                }
              />
            </SettingRow>

            <SettingRow
              icon={settings.pauseAnimations ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              label="Pausar animações"
              description="Pausa todas as animações em execução"
            >
              <Switch
                checked={settings.pauseAnimations}
                onCheckedChange={(checked) =>
                  updateSetting("pauseAnimations", checked)
                }
              />
            </SettingRow>
          </div>

          {/* Visual */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Visual
            </h3>

            <SettingRow
              icon={<Contrast className="h-4 w-4" />}
              label="Alto contraste"
              description="Aumenta o contraste das cores"
            >
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) =>
                  updateSetting("highContrast", checked)
                }
              />
            </SettingRow>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Tamanho do texto</Label>
                    <p className="text-xs text-muted-foreground">
                      {settings.textScale}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateSetting(
                        "textScale",
                        Math.max(75, settings.textScale - 10)
                      )
                    }
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateSetting(
                        "textScale",
                        Math.min(200, settings.textScale + 10)
                      )
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[settings.textScale]}
                onValueChange={([value]) => updateSetting("textScale", value)}
                min={75}
                max={200}
                step={5}
              />
            </div>

            <SettingRow
              icon={<MousePointer className="h-4 w-4" />}
              label="Tamanho do cursor"
              description="Ajusta o tamanho do cursor"
            >
              <select
                value={settings.cursorSize}
                onChange={(e) =>
                  updateSetting(
                    "cursorSize",
                    e.target.value as AccessibilitySettings["cursorSize"]
                  )
                }
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="default">Normal</option>
                <option value="large">Grande</option>
                <option value="extra-large">Extra Grande</option>
              </select>
            </SettingRow>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Navegação
            </h3>

            <SettingRow
              icon={<Eye className="h-4 w-4" />}
              label="Indicadores de foco"
              description="Destaca elementos focados"
            >
              <Switch
                checked={settings.focusIndicators}
                onCheckedChange={(checked) =>
                  updateSetting("focusIndicators", checked)
                }
              />
            </SettingRow>

            <SettingRow
              icon={<Keyboard className="h-4 w-4" />}
              label="Navegação por teclado"
              description="Otimiza para uso com teclado"
            >
              <Switch
                checked={settings.keyboardNavigation}
                onCheckedChange={(checked) =>
                  updateSetting("keyboardNavigation", checked)
                }
              />
            </SettingRow>
          </div>

          {/* Assistive */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Tecnologias Assistivas
            </h3>

            <SettingRow
              icon={<Volume2 className="h-4 w-4" />}
              label="Leitor de tela"
              description="Otimiza para leitores de tela"
            >
              <Switch
                checked={settings.screenReader}
                onCheckedChange={(checked) =>
                  updateSetting("screenReader", checked)
                }
              />
            </SettingRow>
          </div>

          {/* Reset */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={resetSettings}
            >
              Restaurar padrões
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <Label>{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// Skip Link Component
export function SkipLink({ href = "#main-content" }: { href?: string }) {
  return (
    <a
      href={href}
      className={cn(
        "fixed left-4 top-4 z-[100] -translate-y-full rounded-md bg-primary px-4 py-2 text-primary-foreground",
        "transition-transform focus:translate-y-0"
      )}
    >
      Pular para o conteúdo principal
    </a>
  );
}

// Live Region for Screen Readers
export function LiveRegion({
  message,
  politeness = "polite",
}: {
  message: string;
  politeness?: "polite" | "assertive" | "off";
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Focus Trap Hook
export function useFocusTrapAccessibility(isActive: boolean) {
  const trapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !trapRef.current) return;

    const element = trapRef.current;
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener("keydown", handleKeyDown);
    firstElement.focus();

    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  return trapRef;
}

// Announce hook for screen readers
export function useAnnounce() {
  const announce = useCallback(
    (message: string, politeness: "polite" | "assertive" = "polite") => {
      const element = document.createElement("div");
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", politeness);
      element.setAttribute("aria-atomic", "true");
      element.className = "sr-only";
      element.textContent = message;

      document.body.appendChild(element);

      setTimeout(() => {
        document.body.removeChild(element);
      }, 1000);
    },
    []
  );

  return announce;
}

// Roving Tab Index Hook
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[],
  orientation: "horizontal" | "vertical" = "horizontal"
) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    items.forEach((item, index) => {
      item.setAttribute("tabindex", index === focusedIndex ? "0" : "-1");
    });
  }, [items, focusedIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const keys =
        orientation === "horizontal"
          ? { next: "ArrowRight", prev: "ArrowLeft" }
          : { next: "ArrowDown", prev: "ArrowUp" };

      if (e.key === keys.next) {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % items.length);
        items[(focusedIndex + 1) % items.length]?.focus();
      } else if (e.key === keys.prev) {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + items.length) % items.length);
        items[(focusedIndex - 1 + items.length) % items.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        setFocusedIndex(0);
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        items[items.length - 1]?.focus();
      }
    },
    [items, focusedIndex, orientation]
  );

  return { focusedIndex, setFocusedIndex, handleKeyDown };
}

// Reduced Motion Hook
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { settings } = useAccessibility();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion || settings.reduceMotion;
}

// Add global CSS for accessibility features
export function AccessibilityStyles() {
  return (
    <style>{`
      /* Reduce motion */
      .reduce-motion *,
      .reduce-motion *::before,
      .reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }

      /* High contrast */
      .high-contrast {
        --background: 0 0% 0%;
        --foreground: 0 0% 100%;
        --border: 0 0% 100%;
        --ring: 0 0% 100%;
      }

      .high-contrast * {
        border-color: hsl(var(--foreground)) !important;
      }

      /* Large text */
      .large-text {
        font-size: 120%;
      }

      /* Focus indicators */
      .focus-visible *:focus-visible {
        outline: 3px solid hsl(var(--ring));
        outline-offset: 2px;
      }

      /* Cursor sizes */
      [data-cursor-size="large"] {
        cursor: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="8" fill="black"/></svg>') 16 16, auto;
      }

      [data-cursor-size="extra-large"] {
        cursor: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="12" fill="black"/></svg>') 24 24, auto;
      }

      /* Screen reader only */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `}</style>
  );
}
