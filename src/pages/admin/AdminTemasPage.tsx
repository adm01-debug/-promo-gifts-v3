import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, RotateCcw, Sun, Moon, Monitor } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { PresetCard } from '@/components/settings/theme/PresetCard';
import { BorderRadiusControl } from '@/components/settings/theme/BorderRadiusControl';
import { useNavigate } from 'react-router-dom';

export default function AdminTemasPage() {
  const { actualTheme, setTheme: setAppTheme } = useTheme();
  const [config, setConfig] = useState<ThemeConfig>(loadThemeConfig);
  const navigate = useNavigate();

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
      updateConfig({ mode: 'auto' });
    } else {
      setAppTheme(mode);
      updateConfig({ mode });
    }
  };

  const handleSave = () => {
    saveThemeConfig(config);
    toast.success('Tema salvo com sucesso!');
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
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Skins</h1>
            <p className="text-sm text-muted-foreground">
              Escolha sua skin favorita
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1.5" /> Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Original
          </Button>
        </div>
      </div>

      {/* Color Mode */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-display font-semibold text-foreground mb-4">Modo de Cor</h2>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {THEME_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isActive={config.presetId === preset.id}
              onSelect={(id) => updateConfig({ presetId: id })}
            />
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <BorderRadiusControl
        value={config.radius}
        onChange={(v) => updateConfig({ radius: v })}
      />
    </div>
  );
}
