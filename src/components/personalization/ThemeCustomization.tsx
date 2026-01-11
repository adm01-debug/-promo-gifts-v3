import * as React from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings2,
  LayoutGrid,
  LayoutList,
  Maximize2,
  Minimize2,
  Type,
  Grid3X3,
  RotateCcw,
  Save,
  Palette,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// TYPES
// ============================================================================

export type DensityLevel = "compact" | "comfortable" | "spacious";
export type ViewMode = "grid" | "list" | "table";
export type FontSize = "sm" | "base" | "lg" | "xl";

export interface ThemeCustomization {
  accentColor: string;
  borderRadius: number;
  animationsEnabled: boolean;
  reducedMotion: boolean;
}

export interface DisplaySettings {
  density: DensityLevel;
  viewMode: ViewMode;
  fontSize: FontSize;
  showLabels: boolean;
  compactSidebar: boolean;
  stickyHeader: boolean;
}

export interface PersonalizationSettings extends DisplaySettings, ThemeCustomization {}

export interface UsePersonalizationOptions {
  storageKey?: string;
  defaultSettings?: Partial<PersonalizationSettings>;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const defaultPersonalizationSettings: PersonalizationSettings = {
  density: "comfortable",
  viewMode: "grid",
  fontSize: "base",
  showLabels: true,
  compactSidebar: false,
  stickyHeader: true,
  accentColor: "#3b82f6",
  borderRadius: 8,
  animationsEnabled: true,
  reducedMotion: false,
};

// ============================================================================
// HOOK: usePersonalization
// ============================================================================

export function usePersonalization({
  storageKey = "personalization",
  defaultSettings = {},
}: UsePersonalizationOptions = {}) {
  const [settings, setSettingsState] = React.useState<PersonalizationSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          return { ...defaultPersonalizationSettings, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.error("Failed to load personalization settings:", e);
      }
    }
    return { ...defaultPersonalizationSettings, ...defaultSettings };
  });

  // Apply settings to document
  React.useEffect(() => {
    const root = document.documentElement;
    
    // Apply density
    root.dataset.density = settings.density;
    
    // Apply font size
    root.dataset.fontSize = settings.fontSize;
    
    // Apply accent color as CSS variable
    root.style.setProperty("--accent-custom", settings.accentColor);
    
    // Apply border radius
    root.style.setProperty("--radius", `${settings.borderRadius}px`);
    
    // Apply animation preference
    if (!settings.animationsEnabled || settings.reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }

    // Save to storage
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, storageKey]);

  const updateSettings = React.useCallback((updates: Partial<PersonalizationSettings>) => {
    setSettingsState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = React.useCallback(() => {
    setSettingsState({ ...defaultPersonalizationSettings, ...defaultSettings });
  }, [defaultSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    setSettings: setSettingsState,
  };
}

// ============================================================================
// PERSONALIZATION CONTEXT
// ============================================================================

const PersonalizationContext = React.createContext<ReturnType<typeof usePersonalization> | null>(null);

export function PersonalizationProvider({
  children,
  ...options
}: { children: React.ReactNode } & UsePersonalizationOptions) {
  const personalization = usePersonalization(options);

  return (
    <PersonalizationContext.Provider value={personalization}>
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalizationContext() {
  const context = React.useContext(PersonalizationContext);
  if (!context) {
    throw new Error("usePersonalizationContext must be used within PersonalizationProvider");
  }
  return context;
}

// ============================================================================
// DENSITY SELECTOR
// ============================================================================

export interface DensitySelectorProps {
  value: DensityLevel;
  onChange: (value: DensityLevel) => void;
  className?: string;
}

const densityOptions: Array<{ value: DensityLevel; label: string; icon: React.ReactNode }> = [
  { value: "compact", label: "Compacto", icon: <Minimize2 className="h-4 w-4" /> },
  { value: "comfortable", label: "Confortável", icon: <Grid3X3 className="h-4 w-4" /> },
  { value: "spacious", label: "Espaçoso", icon: <Maximize2 className="h-4 w-4" /> },
];

export function DensitySelector({ value, onChange, className }: DensitySelectorProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted rounded-lg", className)}>
      {densityOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
            value === option.value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={option.label}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// VIEW MODE SELECTOR
// ============================================================================

export interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  options?: ViewMode[];
  className?: string;
}

const viewModeConfig: Record<ViewMode, { icon: React.ReactNode; label: string }> = {
  grid: { icon: <LayoutGrid className="h-4 w-4" />, label: "Grade" },
  list: { icon: <LayoutList className="h-4 w-4" />, label: "Lista" },
  table: { icon: <Grid3X3 className="h-4 w-4" />, label: "Tabela" },
};

export function ViewModeSelector({
  value,
  onChange,
  options = ["grid", "list", "table"],
  className,
}: ViewModeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {options.map((mode) => {
        const config = viewModeConfig[mode];
        return (
          <Button
            key={mode}
            variant={value === mode ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onChange(mode)}
            className="h-8 w-8"
            title={config.label}
          >
            {config.icon}
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// FONT SIZE SELECTOR
// ============================================================================

export interface FontSizeSelectorProps {
  value: FontSize;
  onChange: (value: FontSize) => void;
  className?: string;
}

const fontSizeOptions: Array<{ value: FontSize; label: string }> = [
  { value: "sm", label: "Pequeno" },
  { value: "base", label: "Normal" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra Grande" },
];

export function FontSizeSelector({ value, onChange, className }: FontSizeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Type className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={(v) => onChange(v as FontSize)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fontSizeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================================
// ACCENT COLOR PICKER
// ============================================================================

export interface AccentColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const presetColors = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

export function AccentColorPicker({ value, onChange, className }: AccentColorPickerProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm">Cor de destaque</Label>
      </div>
      <div className="flex flex-wrap gap-2">
        {presetColors.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
              value === color ? "border-foreground scale-110" : "border-transparent"
            )}
            style={{ backgroundColor: color }}
            aria-label={`Selecionar cor ${color}`}
          />
        ))}
        <label className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
          />
          <div
            className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center"
            title="Cor personalizada"
          >
            +
          </div>
        </label>
      </div>
    </div>
  );
}

// ============================================================================
// PERSONALIZATION PANEL
// ============================================================================

export interface PersonalizationPanelProps {
  className?: string;
}

export function PersonalizationPanel({ className }: PersonalizationPanelProps) {
  const { settings, updateSettings, resetSettings } = usePersonalizationContext();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Personalizar</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Personalização</h4>
              <p className="text-xs text-muted-foreground">
                Ajuste a interface ao seu gosto
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetSettings}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>

          <Separator />

          {/* Density */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Densidade</Label>
            <DensitySelector
              value={settings.density}
              onChange={(density) => updateSettings({ density })}
            />
          </div>

          {/* View Mode */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Modo de visualização padrão</Label>
            <ViewModeSelector
              value={settings.viewMode}
              onChange={(viewMode) => updateSettings({ viewMode })}
            />
          </div>

          {/* Font Size */}
          <FontSizeSelector
            value={settings.fontSize}
            onChange={(fontSize) => updateSettings({ fontSize })}
          />

          <Separator />

          {/* Accent Color */}
          <AccentColorPicker
            value={settings.accentColor}
            onChange={(accentColor) => updateSettings({ accentColor })}
          />

          {/* Border Radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Arredondamento</Label>
              <span className="text-xs">{settings.borderRadius}px</span>
            </div>
            <Slider
              value={[settings.borderRadius]}
              onValueChange={([borderRadius]) => updateSettings({ borderRadius })}
              min={0}
              max={24}
              step={2}
            />
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="animations" className="text-sm">Animações</Label>
              <Switch
                id="animations"
                checked={settings.animationsEnabled}
                onCheckedChange={(animationsEnabled) => updateSettings({ animationsEnabled })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="labels" className="text-sm">Mostrar rótulos</Label>
              <Switch
                id="labels"
                checked={settings.showLabels}
                onCheckedChange={(showLabels) => updateSettings({ showLabels })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="compact-sidebar" className="text-sm">Sidebar compacta</Label>
              <Switch
                id="compact-sidebar"
                checked={settings.compactSidebar}
                onCheckedChange={(compactSidebar) => updateSettings({ compactSidebar })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sticky-header" className="text-sm">Header fixo</Label>
              <Switch
                id="sticky-header"
                checked={settings.stickyHeader}
                onCheckedChange={(stickyHeader) => updateSettings({ stickyHeader })}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// DENSITY WRAPPER
// ============================================================================

export interface DensityWrapperProps {
  children: React.ReactNode;
  density?: DensityLevel;
  className?: string;
}

const densityClasses: Record<DensityLevel, string> = {
  compact: "space-y-1 text-sm",
  comfortable: "space-y-3 text-base",
  spacious: "space-y-6 text-lg",
};

export function DensityWrapper({ children, density = "comfortable", className }: DensityWrapperProps) {
  return (
    <div className={cn(densityClasses[density], className)}>
      {children}
    </div>
  );
}
