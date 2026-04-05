/**
 * TechniqueSelectionCard - Seleção de técnicas otimizada com:
 * - Recomendações IA baseadas no produto
 * - Configuração inline
 * - Miniaturas de exemplo
 * - Ordenação por Preço, Prazo, Popularidade
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Palette,
  Sparkles,
  LayoutGrid,
  LayoutList,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Clock,
  DollarSign,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useMemo, forwardRef } from 'react';
import type { Technique, TechniqueSettings, Product } from '@/types/simulation';
import type { ColorOption, SizeOption } from '@/hooks/useTechniquePricingOptions';
import { TechniqueCard } from './TechniqueCard';
import {
  useTechniqueRecommendations,
  sortTechniques,
  type SortOption,
  type TechniqueWithRecommendation,
} from '@/hooks/useTechniqueRecommendations';

interface TechniquePricingInfo {
  hasPriceByColor: boolean;
  hasPriceByArea: boolean;
  colorOptions: ColorOption[];
  sizeOptions: SizeOption[];
}

interface TechniqueSelectionCardProps {
  techniques: Technique[] | undefined;
  techniquesLoading: boolean;
  selectedTechniques: string[];
  techniqueSettings: Record<string, TechniqueSettings>;
  onToggle: (id: string) => void;
  onUpdateSetting: (id: string, field: keyof TechniqueSettings, value: number) => void;
  needsColorInput: (code: string) => boolean;
  needsSizeInput: (code: string) => boolean;
  quantity: number;
  getPricingInfo?: (code: string) => TechniquePricingInfo;
  selectedProduct?: Product | null;
}

// Categorias de técnicas
const TECHNIQUE_CATEGORIES = [
  { id: 'all', label: 'Todas', icon: '🎯', codes: [] },
  { id: 'recommended', label: 'Recomendadas', icon: '✨', codes: [] },
  { id: 'silk', label: 'Serigrafia', icon: '🎨', codes: ['SILK', 'SERIGRAFIA'] },
  { id: 'dtf', label: 'DTF/Transfer', icon: '🖨️', codes: ['DTF', 'SUB', 'TRANSFER'] },
  { id: 'embroidery', label: 'Bordado', icon: '🧵', codes: ['BORD', 'EMBROID'] },
  { id: 'laser', label: 'Laser', icon: '⚡', codes: ['LASER'] },
  { id: 'other', label: 'Outras', icon: '🔧', codes: [] },
] as const;

// Opções de ordenação
const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'recommended', label: 'Recomendadas', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: 'price_asc', label: 'Menor Preço', icon: <DollarSign className="h-3.5 w-3.5" /> },
  { value: 'price_desc', label: 'Maior Preço', icon: <DollarSign className="h-3.5 w-3.5" /> },
  { value: 'time_asc', label: 'Mais Rápido', icon: <Clock className="h-3.5 w-3.5" /> },
  { value: 'time_desc', label: 'Mais Lento', icon: <Clock className="h-3.5 w-3.5" /> },
  { value: 'popularity', label: 'Popularidade', icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

// Determinar categoria de uma técnica
const getTechniqueCategory = (code: string): string => {
  const c = code?.toUpperCase() || '';
  for (const cat of TECHNIQUE_CATEGORIES) {
    if (cat.id === 'all' || cat.id === 'other' || cat.id === 'recommended') continue;
    if (cat.codes.some((catCode) => c.includes(catCode))) {
      return cat.id;
    }
  }
  return 'other';
};

export const TechniqueSelectionCard = forwardRef<HTMLDivElement, TechniqueSelectionCardProps>(
  function TechniqueSelectionCard(
    {
      techniques,
      techniquesLoading,
      selectedTechniques,
      techniqueSettings,
      onToggle,
      onUpdateSetting,
      needsColorInput,
      needsSizeInput,
      quantity,
      getPricingInfo,
      selectedProduct,
    },
    ref
  ) {
    const [viewMode, setViewMode] = useState<'expanded' | 'compact'>('expanded');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<SortOption>('recommended');

    // Get AI recommendations
    const { recommendedTechniques, hasRecommendations, recommendationSummary } =
      useTechniqueRecommendations(techniques, selectedProduct || null);

    // Filtrar e ordenar técnicas
    const processedTechniques = useMemo(() => {
      if (!recommendedTechniques || recommendedTechniques.length === 0) return [];

      let filtered = [...recommendedTechniques];

      // Filtrar por categoria
      if (activeCategory === 'recommended') {
        filtered = filtered.filter((t) => t.recommendation.isRecommended);
      } else if (activeCategory !== 'all') {
        filtered = filtered.filter((t) => getTechniqueCategory(t.code || '') === activeCategory);
      }

      // Ordenar
      return sortTechniques(filtered, sortBy, selectedTechniques);
    }, [recommendedTechniques, activeCategory, sortBy, selectedTechniques]);

    // Contar técnicas por categoria
    const categoryCounts = useMemo(() => {
      if (!recommendedTechniques) return {};
      const counts: Record<string, number> = { all: recommendedTechniques.length };

      // Contar recomendadas
      counts.recommended = recommendedTechniques.filter((t) => t.recommendation.isRecommended).length;

      // Contar por categoria
      recommendedTechniques.forEach((t) => {
        const cat = getTechniqueCategory(t.code || '');
        counts[cat] = (counts[cat] || 0) + 1;
      });

      return counts;
    }, [recommendedTechniques]);

    return (
      <Card ref={ref} className="border-2 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                Técnicas de Personalização
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                {selectedProduct ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-warning" />
                    <span className="text-warning">{recommendationSummary}</span>
                  </>
                ) : (
                  'Selecione um produto para ver recomendações'
                )}
                {selectedTechniques.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" />
                    {selectedTechniques.length} selecionada(s)
                  </Badge>
                )}
              </CardDescription>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      pressed={viewMode === 'expanded'}
                      onPressedChange={() => setViewMode('expanded')}
                      size="sm"
                      className={cn(
                        'data-[state=on]:bg-background data-[state=on]:shadow-sm',
                        'h-8 px-3'
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1.5 text-xs">Expandido</span>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Visualização expandida com detalhes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      pressed={viewMode === 'compact'}
                      onPressedChange={() => setViewMode('compact')}
                      size="sm"
                      className={cn(
                        'data-[state=on]:bg-background data-[state=on]:shadow-sm',
                        'h-8 px-3'
                      )}
                    >
                      <LayoutList className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1.5 text-xs">Compacto</span>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Visualização compacta em lista</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Filters and sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
            {/* Category filters */}
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {TECHNIQUE_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                if (cat.id !== 'all' && cat.id !== 'recommended' && count === 0) return null;
                if (cat.id === 'recommended' && count === 0) return null;

                const isRecommended = cat.id === 'recommended';

                return (
                  <motion.button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      'border',
                      activeCategory === cat.id
                        ? isRecommended
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground border-amber-500 shadow-md'
                          : 'bg-primary text-primary-foreground border-primary shadow-md'
                        : isRecommended
                        ? 'bg-warning/5 text-warning border-warning/20 hover:border-amber-400'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:bg-muted'
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <Badge
                      variant={activeCategory === cat.id ? 'secondary' : 'outline'}
                      className={cn(
                        'h-5 px-1.5 text-[10px]',
                        activeCategory === cat.id &&
                          (isRecommended
                            ? 'bg-white/20 text-primary-foreground'
                            : 'bg-primary-foreground/20 text-primary-foreground')
                      )}
                    >
                      {count}
                    </Badge>
                  </motion.button>
                );
              })}
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {techniquesLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                'space-y-2 max-h-[500px] overflow-y-auto pr-2',
                viewMode === 'compact' && 'space-y-1'
              )}
            >
              <AnimatePresence mode="popLayout">
                {processedTechniques.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <Filter className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma técnica nesta categoria</p>
                    <Button variant="link" size="sm" onClick={() => setActiveCategory('all')}>
                      Ver todas as técnicas
                    </Button>
                  </motion.div>
                ) : (
                  processedTechniques.map((technique) => {
                    const settings = techniqueSettings[technique.id] || {
                      colors: 1,
                      width: 10,
                      height: 10,
                      positions: 1,
                    };

                    // Get dynamic pricing info if available
                    const pricingInfo = getPricingInfo?.(technique.code || '');
                    const showColors = pricingInfo?.hasPriceByColor ?? needsColorInput(technique.code || '');
                    const showSize = pricingInfo?.hasPriceByArea ?? needsSizeInput(technique.code || '');
                    const colorOptions = pricingInfo?.colorOptions || [];
                    const sizeOptions = pricingInfo?.sizeOptions || [];

                    return (
                      <TechniqueCard
                        key={technique.id}
                        technique={technique}
                        isSelected={selectedTechniques.includes(technique.id)}
                        settings={settings}
                        showColors={showColors}
                        showSize={showSize}
                        colorOptions={colorOptions}
                        sizeOptions={sizeOptions}
                        quantity={quantity}
                        onToggle={() => onToggle(technique.id)}
                        onUpdateSetting={(field, value) => onUpdateSetting(technique.id, field, value)}
                        viewMode={viewMode}
                      />
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {!techniquesLoading && (!techniques || techniques.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <Palette className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma técnica cadastrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
