import { useState, useEffect, useCallback } from 'react';
import { Palette, Sun, Moon, Monitor, RotateCcw, Check } from 'lucide-react';
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

  const handleModeChange = (mode: 'light' | 'dark' | 'system') => {
    if (mode === 'system') {
      setAppTheme('auto');
      updateConfig({ mode: 'auto' as any });
    } else {
      setAppTheme(mode);
      updateConfig({ mode });
    }
  };

  const handleReset = () => {
    clearThemeOverrides();
    const def = getDefaultConfig();
    setConfig(def);
    saveThemeConfig(def);
    setAppTheme('auto');
    toast.success('Tema restaurado ao padrão');
  };

  const currentMode = config.mode === 'auto' ? 'system' : config.mode;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Color Mode */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Modo de Cor</h2>
          <div className="flex gap-3">
            {[
              { key: 'light' as const, icon: Sun, label: 'Claro' },
              { key: 'dark' as const, icon: Moon, label: 'Escuro' },
              { key: 'system' as const, icon: Monitor, label: 'Sistema' },
            ].map(({ key, icon: Icon, label }) => (
              <Button
                key={key}
                variant={currentMode === key ? 'default' : 'outline'}
                size="sm"
                className="px-5"
                onClick={() => handleModeChange(key)}
              >
                <Icon className="h-4 w-4 mr-2" /> {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Presets Grid */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">
          {THEME_PRESETS.length} skins disponíveis
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {THEME_PRESETS.map((preset) => {
            const isActive = config.presetId === preset.id;
            return (
              <Card
                key={preset.id}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 relative group overflow-hidden',
                  isActive && 'ring-2 ring-primary shadow-glow-primary'
                )}
                onClick={() => updateConfig({ presetId: preset.id })}
              >
                <CardContent className="p-4">
                  {/* Gradient swatch */}
                  <div
                    className="h-10 w-full rounded-lg mb-3"
                    style={{
                      background: `linear-gradient(90deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 50%, ${preset.colors[2]} 100%)`,
                    }}
                  />
                  {isActive && (
                    <div className="absolute top-3 right-3">
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{preset.emoji}</span>
                    <h3 className="text-xs font-bold text-foreground">{preset.name}</h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 italic">{preset.description}</p>
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
          <div className="flex items-center gap-4 mt-6 pt-5 border-t border-border/50">
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
