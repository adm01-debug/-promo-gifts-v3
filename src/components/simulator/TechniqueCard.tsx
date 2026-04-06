/**
 * TechniqueCard - Card individual de técnica com:
 * - Badge de recomendação IA
 * - Miniatura de exemplo
 * - Configuração inline
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Clock,
  DollarSign,
  Palette,
  Ruler,
  Info,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/hooks/useSimulation';
import type { TechniqueSettings } from '@/types/simulation';
import type { TechniqueWithRecommendation } from '@/hooks/useTechniqueRecommendations';
import type { ColorOption, SizeOption } from '@/hooks/useTechniquePricingOptions';

// Miniaturas de exemplo por categoria de técnica
const TECHNIQUE_THUMBNAILS: Record<string, string> = {
  'SILK': 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=100&h=100&fit=crop',
  'SERIGRAFIA': 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=100&h=100&fit=crop',
  'DTF': 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=100&h=100&fit=crop',
  'SUB': 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=100&h=100&fit=crop',
  'BORD': 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=100&h=100&fit=crop',
  'LASER': 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop',
  'TRANSFER': 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=100&h=100&fit=crop',
  'UV': 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=100&h=100&fit=crop',
};

// Ícone e cor baseado no código da técnica
const getTechniqueStyle = (code: string) => {
  const c = code?.toUpperCase() || '';
  if (c.includes('SILK') || c.includes('SERIGRAFIA')) {
    return { color: 'bg-primary', textColor: 'text-primary', icon: '🎨' };
  }
  if (c.includes('DTF')) {
    return { color: 'bg-info', textColor: 'text-info', icon: '🖨️' };
  }
  if (c.includes('SUB') || c.includes('TRANSFER')) {
    return { color: 'bg-primary', textColor: 'text-primary', icon: '🌈' };
  }
  if (c.includes('BORD') || c.includes('EMBROID')) {
    return { color: 'bg-warning', textColor: 'text-warning', icon: '🧵' };
  }
  if (c.includes('LASER')) {
    return { color: 'bg-destructive', textColor: 'text-destructive', icon: '⚡' };
  }
  if (c.includes('UV')) {
    return { color: 'bg-primary', textColor: 'text-primary', icon: '💜' };
  }
  return { color: 'bg-muted-foreground', textColor: 'text-muted-foreground', icon: '✨' };
};

// Encontrar thumbnail para técnica
const getTechniqueThumbnail = (code: string): string | null => {
  const c = code?.toUpperCase() || '';
  for (const [key, url] of Object.entries(TECHNIQUE_THUMBNAILS)) {
    if (c.includes(key)) return url;
  }
  return null;
};

interface TechniqueCardProps {
  technique: TechniqueWithRecommendation;
  isSelected: boolean;
  settings: TechniqueSettings;
  showColors: boolean;
  showSize: boolean;
  colorOptions: ColorOption[];
  sizeOptions: SizeOption[];
  quantity: number;
  onToggle: () => void;
  onUpdateSetting: (field: keyof TechniqueSettings, value: number) => void;
  viewMode: 'expanded' | 'compact';
}

export function TechniqueCard({
  technique,
  isSelected,
  settings,
  showColors,
  showSize,
  colorOptions,
  sizeOptions,
  quantity,
  onToggle,
  onUpdateSetting,
  viewMode,
}: TechniqueCardProps) {
  const [showConfig, setShowConfig] = useState(false);
  
  const style = getTechniqueStyle(technique.code || '');
  const thumbnail = getTechniqueThumbnail(technique.code || '');
  const { recommendation } = technique;
  
  const getSlaInfo = (days: number) => {
    if (days <= 3) return { label: 'Express', color: 'bg-primary', textColor: 'text-primary' };
    if (days <= 7) return { label: 'Padrão', color: 'bg-warning', textColor: 'text-warning' };
    return { label: 'Estendido', color: 'bg-destructive', textColor: 'text-destructive' };
  };
  
  const sla = getSlaInfo(technique.estimated_days);
  const estimatedCost = technique.unit_cost * quantity + technique.setup_cost;
  const needsConfig = showColors || showSize;
  
  // Auto-expand config when selected and needs config
  const showInlineConfig = isSelected && needsConfig;
  
  // COMPACT VIEW
  if (viewMode === 'compact') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.15 }}
      >
        <div
          onClick={onToggle}
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
            isSelected
              ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50 bg-card hover:shadow-sm'
          )}
        >
          {/* Thumbnail/Icon */}
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <div className="relative flex-shrink-0">
                {thumbnail ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden ring-2 ring-border">
                    <img
                      src={thumbnail}
                      alt={technique.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-lg',
                    style.color, 'text-primary-foreground'
                  )}>
                    {style.icon}
                  </div>
                )}
                
                {/* Selection check */}
                {isSelected && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <span className="text-[8px] text-primary-foreground font-bold">✓</span>
                  </motion.div>
                )}
              </div>
            </HoverCardTrigger>
            <HoverCardContent side="right" className="w-64 p-3">
              <TechniquePreview technique={technique} thumbnail={thumbnail} />
            </HoverCardContent>
          </HoverCard>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{technique.name}</span>
              
              {/* Recommendation badge */}
              {recommendation.isRecommended && (
                <Badge className="bg-gradient-to-r from-warning to-orange text-primary-foreground text-[10px] px-1.5 h-5 gap-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                  IA
                </Badge>
              )}
              
              <Badge variant="outline" className="text-[10px] font-mono px-1 h-4 hidden sm:inline-flex">
                {technique.code}
              </Badge>
            </div>
            
            {recommendation.isRecommended && (
              <p className="text-[10px] text-warning truncate">
                {recommendation.recommendationReason}
              </p>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
            <span className={cn('flex items-center gap-1', sla.textColor)}>
              <Clock className="h-3 w-3" />
              {technique.estimated_days}d
            </span>
            <span className="font-mono font-medium hidden sm:inline">
              {formatCurrency(estimatedCost)}
            </span>
          </div>
        </div>
        
        {/* Inline config */}
        <AnimatePresence>
          {showInlineConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 ml-6 mt-1 border-l-2 border-primary/30 bg-muted/30 rounded-r-lg">
                <InlineConfigForm
                  technique={technique}
                  settings={settings}
                  showColors={showColors}
                  showSize={showSize}
                  colorOptions={colorOptions}
                  sizeOptions={sizeOptions}
                  onUpdateSetting={onUpdateSetting}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
  
  // EXPANDED VIEW
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.005 }}
    >
      <div
        className={cn(
          'relative rounded-xl border-2 transition-all duration-200 overflow-hidden',
          isSelected
            ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
            : 'border-border hover:border-primary/50 hover:shadow-md bg-card'
        )}
      >
        {/* Recommendation banner */}
        {recommendation.isRecommended && !isSelected && (
          <div className="absolute top-0 right-0 z-10">
            <div className="bg-gradient-to-l from-warning to-orange text-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Recomendada
            </div>
          </div>
        )}
        
        {/* Main row */}
        <div className="p-4 cursor-pointer" onClick={onToggle}>
          <div className="flex items-start gap-4">
            {/* Thumbnail with hover preview */}
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <motion.div
                  className="relative flex-shrink-0"
                  animate={isSelected ? {
                    boxShadow: ['0 0 0 0 rgba(99, 102, 241, 0)', '0 0 0 6px rgba(99, 102, 241, 0.1)', '0 0 0 0 rgba(99, 102, 241, 0)'],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {thumbnail ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-border">
                      <img
                        src={thumbnail}
                        alt={technique.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className={cn(
                        'absolute bottom-0 right-0 w-6 h-6 rounded-tl-lg rounded-br-lg flex items-center justify-center text-sm',
                        style.color, 'text-primary-foreground'
                      )}>
                        {style.icon}
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center text-2xl',
                      style.color, 'text-primary-foreground'
                    )}>
                      {style.icon}
                    </div>
                  )}
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <motion.div
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <span className="text-xs text-primary-foreground font-bold">✓</span>
                    </motion.div>
                  )}
                </motion.div>
              </HoverCardTrigger>
              <HoverCardContent side="right" className="w-72 p-4">
                <TechniquePreview technique={technique} thumbnail={thumbnail} expanded />
              </HoverCardContent>
            </HoverCard>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-base">{technique.name}</h4>
                <Badge variant="outline" className="text-xs font-mono">
                  {technique.code}
                </Badge>
                
                {recommendation.isRecommended && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="bg-gradient-to-r from-warning to-orange text-primary-foreground text-xs gap-1">
                          <Sparkles className="h-3 w-3" />
                          Recomendada IA
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{recommendation.recommendationReason}</p>
                        {recommendation.matchedKeywords.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Match: {recommendation.matchedKeywords.join(', ')}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {isSelected && (
                  <Badge className="bg-primary/20 text-primary text-xs">
                    ✓ Selecionada
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {technique.description || 'Técnica de personalização'}
              </p>
              
              {/* Quick stats */}
              <div className="flex items-center gap-4 mt-2 text-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      <Clock className={cn('h-3.5 w-3.5', sla.textColor)} />
                      <span className={cn('font-medium', sla.textColor)}>
                        {technique.estimated_days}d
                      </span>
                      <Badge variant="outline" className={cn('text-[10px] h-4', sla.textColor)}>
                        {sla.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Prazo: {technique.estimated_days} dias úteis</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="font-mono">{formatCurrency(technique.unit_cost)}/un</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Setup: {formatCurrency(technique.setup_cost)}</p>
                      <p>Mín: {technique.min_quantity} un</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {recommendation.popularityScore >= 70 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-warning">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="text-xs">Popular</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Alta demanda no mercado</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            
            {/* Right side - Cost */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <p className="text-xs text-muted-foreground">Estimativa</p>
              <p className="font-bold text-lg">{formatCurrency(estimatedCost)}</p>
              
              {recommendation.isRecommended && (
                <div className="flex items-center gap-1 text-warning">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-[10px] font-medium">
                    {recommendation.recommendationScore}% match
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Inline config - always visible when selected */}
        <AnimatePresence>
          {showInlineConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 border-t border-border/50 bg-muted/30">
                <InlineConfigForm
                  technique={technique}
                  settings={settings}
                  showColors={showColors}
                  showSize={showSize}
                  colorOptions={colorOptions}
                  sizeOptions={sizeOptions}
                  onUpdateSetting={onUpdateSetting}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Componente de preview da técnica
function TechniquePreview({
  technique,
  thumbnail,
  expanded = false,
}: {
  technique: TechniqueWithRecommendation;
  thumbnail: string | null;
  expanded?: boolean;
}) {
  const style = getTechniqueStyle(technique.code || '');
  
  return (
    <div className="space-y-3">
      {thumbnail && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={thumbnail.replace('w=100&h=100', 'w=400&h=225')}
            alt={technique.name}
            className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center text-lg',
          style.color, 'text-primary-foreground'
        )}>
          {style.icon}
        </div>
        <div>
          <h4 className="font-semibold text-sm">{technique.name}</h4>
          <p className="text-xs text-muted-foreground">{technique.code}</p>
        </div>
      </div>
      
      {expanded && (
        <>
          <p className="text-sm text-muted-foreground">
            {technique.description || 'Técnica de personalização de alta qualidade.'}
          </p>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>{technique.estimated_days} dias úteis</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span>{formatCurrency(technique.unit_cost)}/un</span>
            </div>
          </div>
          
          {technique.recommendation.isRecommended && (
            <div className="flex items-center gap-2 p-2 bg-warning/5 rounded-lg">
              <Sparkles className="h-4 w-4 text-warning" />
              <p className="text-xs text-warning">
                {technique.recommendation.recommendationReason}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Formulário de configuração inline
function InlineConfigForm({
  technique,
  settings,
  showColors,
  showSize,
  colorOptions,
  sizeOptions,
  onUpdateSetting,
}: {
  technique: TechniqueWithRecommendation;
  settings: TechniqueSettings;
  showColors: boolean;
  showSize: boolean;
  colorOptions: ColorOption[];
  sizeOptions: SizeOption[];
  onUpdateSetting: (field: keyof TechniqueSettings, value: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
      {showColors && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Cores
          </Label>
          {colorOptions.length > 0 ? (
            <Select
              value={settings.colors.toString()}
              onValueChange={(val) => onUpdateSetting('colors', parseInt(val))}
            >
              <SelectTrigger className="h-9" onClick={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type="number"
              min={1}
              max={12}
              value={settings.colors}
              onChange={(e) => onUpdateSetting('colors', parseInt(e.target.value) || 1)}
              className="h-9"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
      
      {showSize && sizeOptions.length > 0 && (
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            Tamanho
          </Label>
          <Select
            value={`${settings.width}x${settings.height}`}
            onValueChange={(val) => {
              const [w, h] = val.split('x').map(Number);
              onUpdateSetting('width', w);
              setTimeout(() => onUpdateSetting('height', h), 0);
            }}
          >
            <SelectTrigger className="h-9" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} ({opt.areaCm2} cm²)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {showSize && sizeOptions.length === 0 && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Largura (cm)</Label>
            <Input
              type="number"
              min={1}
              value={settings.width}
              onChange={(e) => onUpdateSetting('width', parseInt(e.target.value) || 1)}
              className="h-9"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Altura (cm)</Label>
            <Input
              type="number"
              min={1}
              value={settings.height}
              onChange={(e) => onUpdateSetting('height', parseInt(e.target.value) || 1)}
              className="h-9"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </>
      )}
      
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          Posições
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Locais de gravação</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={settings.positions}
          onChange={(e) => onUpdateSetting('positions', parseInt(e.target.value) || 1)}
          className="h-9"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      {showSize && sizeOptions.length === 0 && (
        <div className="col-span-full">
          <p className="text-xs text-muted-foreground">
            Área: <span className="font-mono font-medium">{settings.width * settings.height} cm²</span>
          </p>
        </div>
      )}
    </div>
  );
}
