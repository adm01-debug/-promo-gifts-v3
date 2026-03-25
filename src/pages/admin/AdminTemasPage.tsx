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
  exportThemeConfig,
  importThemeConfig,
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

  const handleExport = () => {
    const json = exportThemeConfig(config);
    navigator.clipboard.writeText(json);
    toast.success('Configuração copiada para a área de transferência');
  };

  const handleImport = () => {
    const json = prompt('Cole a configuração JSON do tema:');
    if (!json) return;
    const imported = importThemeConfig(json);
    if (imported) {
      setConfig(imported);
      saveThemeConfig(imported);
      if (imported.mode === 'light' || imported.mode === 'dark') {
        setAppTheme(imported.mode);
      }
      toast.success('Tema importado com sucesso');
    } else {
      toast.error('JSON inválido');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-display font-bold text-foreground">Personalizar Tema</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha um preset ou customize as cores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-1.5" /> Importar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" /> Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Color Mode */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Modo de Cor</h2>
          <div className="flex gap-2">
            <Button
              variant={actualTheme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('light')}
            >
              <Sun className="h-4 w-4 mr-1.5" /> Claro
            </Button>
            <Button
              variant={actualTheme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('dark')}
            >
              <Moon className="h-4 w-4 mr-1.5" /> Escuro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEME_PRESETS.map((preset) => {
          const isActive = config.presetId === preset.id;
          return (
            <Card
              key={preset.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md relative',
                isActive && 'ring-2 ring-primary shadow-glow-primary'
              )}
              onClick={() => updateConfig({ presetId: preset.id })}
            >
              <CardContent className="pt-5 pb-4 px-5">
                {isActive && (
                  <div className="absolute top-3 right-3">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="flex gap-1.5 mb-3">
                  {preset.colors.map((color, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <h3 className="text-sm font-semibold text-foreground">{preset.name}</h3>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Border Radius */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Raio da Borda</h2>
              <p className="text-xs text-muted-foreground">Ajuste o arredondamento dos elementos</p>
            </div>
            <span className="text-sm font-mono text-muted-foreground">{config.radius}px</span>
          </div>
          <Slider
            value={[config.radius]}
            min={0}
            max={20}
            step={1}
            onValueChange={([v]) => updateConfig({ radius: v })}
            className="my-4"
          />
          {/* Live preview */}
          <div className="flex items-center gap-3 mt-4">
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
              className="h-16 w-24 border border-border bg-card flex items-center justify-center text-sm font-medium text-foreground"
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
