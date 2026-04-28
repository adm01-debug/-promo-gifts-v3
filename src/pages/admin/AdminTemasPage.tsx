import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Save, Palette, Sun, Moon, Monitor, Sparkles, Check, Type, Gamepad2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  THEME_PRESETS,
  FONT_PAIRS,
  type ThemeConfig,
  loadThemeConfig,
  saveThemeConfig,
  applyThemePreset,
  applyRadius,
  applyFontPair,
  clearThemeOverrides,
  getDefaultConfig,
} from '@/lib/theme-presets';
import { PresetCard } from '@/components/settings/theme/PresetCard';
import { BorderRadiusControl } from '@/components/settings/theme/BorderRadiusControl';

import { ThemeResetDialog } from '@/components/settings/theme/ThemeResetDialog';
import { PageSEO } from '@/components/seo/PageSEO';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

export default function AdminTemasPage() {
  const { actualTheme, setTheme: setAppTheme } = useTheme();
  const [config, setConfig] = useState<ThemeConfig>(loadThemeConfig);
  const [savedConfig, setSavedConfig] = useState<ThemeConfig>(loadThemeConfig);

  const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(savedConfig);

  const applyAll = useCallback((cfg: ThemeConfig, mode: 'light' | 'dark') => {
    applyThemePreset(cfg.presetId, mode);
    applyRadius(cfg.radius);
    applyFontPair(cfg.fontPairId);
  }, []);

  const classicPresets = useMemo(() => THEME_PRESETS.filter((p) => p.category !== 'gx'), []);
  const gxPresets = useMemo(() => THEME_PRESETS.filter((p) => p.category === 'gx'), []);

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
      description: `Skin "${THEME_PRESETS.find((p) => p.id === config.presetId)?.name}" aplicada.`,
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

  // Reservado para uso futuro pelo botão de importação de tema
  const _handleImport = (imported: ThemeConfig) => {
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
      <PageSEO
        title="Temas"
        description="Personalize a aparência visual da plataforma."
        path="/admin/temas"
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        {/* Sticky compact header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="sticky top-0 z-10 -mx-4 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Palette className="h-5 w-5 shrink-0 text-primary" />
              <h1 className="truncate font-display text-xl font-bold text-foreground">Skins</h1>
              {/* Badge da skin ativa */}
              <span className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex">
                <Check className="h-3 w-3" />
                {THEME_PRESETS.find((p) => p.id === config.presetId)?.name || 'Padrão'}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={handleSave} className="relative gap-1.5">
                <Save className="h-3.5 w-3.5" /> Salvar
                {hasUnsavedChanges && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                )}
              </Button>
              <ThemeResetDialog onConfirm={handleReset} />
            </div>
          </div>
        </motion.div>

        {/* Color Mode */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sun className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold text-foreground">Modo de Cor</h2>
              </div>
              <div className="flex gap-2 sm:gap-3">
                {[
                  { key: 'light' as const, icon: Sun, label: 'Claro' },
                  { key: 'dark' as const, icon: Moon, label: 'Escuro' },
                  { key: 'system' as const, icon: Monitor, label: 'Sistema' },
                  // eslint-disable-next-line @typescript-eslint/naming-convention -- componente JSX precisa começar com letra maiúscula
                ].map(({ key, icon: Icon, label }) => (
                  <Button
                    key={key}
                    variant={currentMode === key ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2 px-4 sm:px-5"
                    onClick={() => handleModeChange(key)}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Classic Presets Grid */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-semibold text-foreground">Skins clássicas</h2>
            <span className="text-xs text-muted-foreground">({classicPresets.length})</span>
          </div>
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
            role="radiogroup"
            aria-label="Skins clássicas"
          >
            {classicPresets.map((preset, i) => (
              <motion.div
                key={preset.id}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2.5 + i * 0.05}
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

        {/* Opera GX Presets Grid */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2.5}>
          <div className="mb-4 flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-semibold text-foreground">Skins Opera GX</h2>
            <span className="text-xs text-muted-foreground">({gxPresets.length})</span>
            <span className="ml-1 inline-flex items-center rounded-md border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Gamer
            </span>
          </div>
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
            role="radiogroup"
            aria-label="Skins Opera GX"
          >
            {gxPresets.map((preset, i) => (
              <motion.div
                key={preset.id}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={3 + i * 0.05}
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

        {/* Font Pair Selector */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-semibold text-foreground">Tipografia</h2>
                <span className="text-xs text-muted-foreground">({FONT_PAIRS.length} pares)</span>
              </div>
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                role="radiogroup"
                aria-label="Pares de fontes"
              >
                {FONT_PAIRS.map((pair) => {
                  const isActive = config.fontPairId === pair.id;
                  return (
                    <button
                      key={pair.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => updateConfig({ fontPairId: pair.id })}
                      className={cn(
                        'relative rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5',
                        isActive
                          ? 'border-primary shadow-glow-primary ring-2 ring-primary/60'
                          : 'border-border hover:border-primary/40 hover:shadow-md',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="shrink-0 text-base">{pair.emoji}</span>
                          <h3 className="truncate font-display text-xs font-bold text-foreground">
                            {pair.name}
                          </h3>
                        </div>
                        {isActive && (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div
                        className="truncate text-base leading-snug text-foreground/90"
                        style={{ fontFamily: pair.display }}
                      >
                        Aa Bb 123
                      </div>
                      <div
                        className="mt-0.5 truncate text-[11px] text-muted-foreground"
                        style={{ fontFamily: pair.sans }}
                      >
                        {pair.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
