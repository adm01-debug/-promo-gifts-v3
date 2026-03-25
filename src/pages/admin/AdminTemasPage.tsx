import { useState, useEffect, useCallback } from 'react';
import { Palette, Sun, Moon, RotateCcw, Check, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import {
  THEME_PRESETS,
  type ThemeConfig,
  loadThemeConfig,
  saveThemeConfig,
  applyThemePreset,
  applyRadius,
  clearThemeOverrides,
  getDefaultConfig,
} from '@/lib/theme-presets';

export default function AdminTemasPage() {
  const { actualTheme, setTheme: setAppTheme } = useTheme();
  const [config, setConfig] = useState<ThemeConfig>(loadThemeConfig);

  // Apply on mount + changes
  const applyAll = useCallback((cfg: ThemeConfig, mode: 'light' | 'dark') => {
    applyThemePreset(cfg.presetId, mode);
    applyRadius(cfg.radius);
  }, []);

  useEffect(() => {
    applyAll(config, actualTheme);
  }, [config, actualTheme, applyAll]);

  const updateConfig = (partial: Partial<ThemeConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    saveThemeConfig(next);
  };

  const handleModeChange = (mode: 'light' | 'dark') => {
    setAppTheme(mode);
    updateConfig({ mode });
  };

  const handleReset = () => {
    clearThemeOverrides();
    const def = getDefaultConfig();
    setConfig(def);
    saveThemeConfig(def);
    setAppTheme('auto');
    toast.success('Tema restaurado ao padrão');
  };

  const handleSave = () => {
    saveThemeConfig(config);
    toast.success('Tema salvo com sucesso');
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Personalizar Tema</h1>
              <p className="text-sm text-muted-foreground">
                Escolha um preset ou customize as cores
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1.5" /> Salvar
          </Button>
        </div>
      </div>

      {/* Color Mode */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Modo de Cor</h2>
          <div className="flex gap-3">
            <Button
              variant={actualTheme === 'light' ? 'default' : 'outline'}
              size="sm"
              className="px-5"
              onClick={() => handleModeChange('light')}
            >
              <Sun className="h-4 w-4 mr-2" /> Claro
            </Button>
            <Button
              variant={actualTheme === 'dark' ? 'default' : 'outline'}
              size="sm"
              className="px-5"
              onClick={() => handleModeChange('dark')}
            >
              <Moon className="h-4 w-4 mr-2" /> Escuro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Presets Grid */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">Temas Disponíveis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEME_PRESETS.map((preset) => {
            const isActive = config.presetId === preset.id;
            return (
              <Card
                key={preset.id}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 relative group',
                  isActive && 'ring-2 ring-primary shadow-glow-primary'
                )}
                onClick={() => updateConfig({ presetId: preset.id })}
              >
                <CardContent className="p-5">
                  {isActive && (
                    <div className="absolute top-4 right-4">
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mb-4">
                    {preset.colors.map((color, i) => (
                      <div
                        key={i}
                        className="h-7 w-7 rounded-full border-2 border-border/50 shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{preset.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Border Radius */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Raio da Borda</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Ajuste o arredondamento dos elementos</p>
            </div>
            <span className="text-sm font-mono font-semibold text-foreground bg-muted px-3 py-1 rounded-md">
              {config.radius}px
            </span>
          </div>
          <Slider
            value={[config.radius]}
            min={0}
            max={20}
            step={1}
            onValueChange={([v]) => updateConfig({ radius: v })}
            className="my-5"
          />
          {/* Live preview */}
          <div className="flex items-center gap-4 mt-6 pt-5 border-t border-border/50">
            <span className="text-xs text-muted-foreground mr-1">Preview:</span>
            <Button size="sm" style={{ borderRadius: `${config.radius}px` }}>
              Botão
            </Button>
            <div
              className="h-9 w-24 border border-input bg-background flex items-center px-3 text-sm text-muted-foreground"
              style={{ borderRadius: `${config.radius}px` }}
            >
              Input
            </div>
            <div
              className="h-16 w-24 border border-border bg-card flex items-center justify-center text-sm font-medium text-foreground shadow-xs"
              style={{ borderRadius: `${config.radius}px` }}
            >
              Card
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}