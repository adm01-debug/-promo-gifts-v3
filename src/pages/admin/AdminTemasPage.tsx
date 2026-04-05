import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ArrowLeft, Save, Palette, Sun, Moon, Monitor, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
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

import { ThemeResetDialog } from '@/components/settings/theme/ThemeResetDialog';
import { useNavigate } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

export default function AdminTemasPage() {
  const { actualTheme, setTheme: setAppTheme } = useTheme();
  const [config, setConfig] = useState<ThemeConfig>(loadThemeConfig);
  const [savedConfig, setSavedConfig] = useState<ThemeConfig>(loadThemeConfig);
  const navigate = useNavigate();

  const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(savedConfig);

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
    // Auto-save on every change for instant feedback
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
    setSavedConfig(config);
    toast.success('Tema salvo com sucesso!', {
      description: `Skin "${THEME_PRESETS.find(p => p.id === config.presetId)?.name}" aplicada.`,
    });
  };

  const handleReset = () => {
    clearThemeOverrides();
    const def = getDefaultConfig();
    setConfig(def);
    setSavedConfig(def);
    saveThemeConfig(def);
    setAppTheme('auto');
    toast.success('Tema restaurado ao padrão');
  };

  const handleImport = (imported: ThemeConfig) => {
    setConfig(imported);
    saveThemeConfig(imported);
    setSavedConfig(imported);
    if (imported.mode === 'auto') {
      setAppTheme('auto');
    } else {
      setAppTheme(imported.mode);
    }
  };

  const currentMode = config.mode === 'auto' ? 'system' : config.mode;

  return (
    <MainLayout>
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-display font-bold text-foreground">Skins</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Escolha sua skin favorita
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-12 sm:ml-0">
          <Button size="sm" onClick={handleSave} className="gap-1.5 relative">
            <Save className="h-3.5 w-3.5" /> Salvar
            {hasUnsavedChanges && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
            )}
          </Button>
          <ThemeResetDialog onConfirm={handleReset} />
        </div>
      </motion.div>

      {/* Color Mode */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sun className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-display font-semibold text-foreground">Modo de Cor</h2>
            </div>
            <div className="flex gap-2 sm:gap-3">
              {[
                { key: 'light' as const, icon: Sun, label: 'Claro' },
                { key: 'dark' as const, icon: Moon, label: 'Escuro' },
                { key: 'system' as const, icon: Monitor, label: 'Sistema' },
              ].map(({ key, icon: Icon, label }) => (
                <Button
                  key={key}
                  variant={currentMode === key ? 'default' : 'outline'}
                  size="sm"
                  className="px-4 sm:px-5 gap-2"
                  onClick={() => handleModeChange(key)}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Presets Grid */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-display font-semibold text-foreground">
            {THEME_PRESETS.length} skins disponíveis
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" role="radiogroup" aria-label="Skins disponíveis">
          {THEME_PRESETS.map((preset, i) => (
            <motion.div
              key={preset.id}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2.5 + i * 0.06}
            >
              <PresetCard
                preset={preset}
                isActive={config.presetId === preset.id}
                onSelect={(id) => updateConfig({ presetId: id })}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Border Radius */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3.5}>
        <BorderRadiusControl
          value={config.radius}
          onChange={(v) => updateConfig({ radius: v })}
        />
      </motion.div>
    </div>
    </MainLayout>
  );
}
