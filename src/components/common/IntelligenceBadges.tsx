/**
 * IntelligenceBadges — renders market intelligence badges on product pages.
 * Data-driven from useProductIntelligenceBadges hook.
 */
import { motion } from 'framer-motion';
import { Flame, Zap, Package, Rocket, AlertTriangle, Sparkles, Star, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type {
  IntelligenceBadge,
  IntelligenceBadgeType,
} from '@/hooks/useProductIntelligenceBadges';

const badgeConfig: Record<
  IntelligenceBadgeType,
  {
    icon: typeof Flame;
    colors: string;
    animation?: string;
  }
> = {
  featured: {
    icon: Sparkles,
    colors: 'bg-primary/15 text-primary border-primary/30',
  },
  'new-arrival': {
    icon: Star,
    colors: 'bg-primary/15 text-primary border-primary/30',
  },
  'on-sale': {
    icon: Tag,
    colors: 'bg-primary/15 text-primary border-primary/30',
    animation: 'animate-pulse',
  },
  'best-seller': {
    icon: Flame,
    colors: 'bg-primary/15 text-primary border-primary/30',
  },
  popular: {
    icon: Zap,
    colors: 'bg-primary/15 text-primary border-primary/30',
  },
  normal: {
    icon: Package,
    colors: 'bg-muted text-muted-foreground border-border',
  },
  emergente: {
    icon: Rocket,
    colors: 'bg-primary/15 text-primary border-primary/30',
    animation: 'animate-pulse',
  },
  'last-units': {
    icon: AlertTriangle,
    colors: 'bg-destructive/15 text-destructive border-destructive/30',
    animation: 'animate-pulse',
  },
};

interface IntelligenceBadgesProps {
  badges: IntelligenceBadge[];
  turnoverScore?: number | null;
  isDemo?: boolean;
  className?: string;
}

export function IntelligenceBadges({
  badges,
  turnoverScore,
  isDemo,
  className,
}: IntelligenceBadgesProps) {
  if (!badges.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <TooltipProvider>
        {badges.map((badge, i) => {
          const config = badgeConfig[badge.type];
          const Icon = config.icon;

          return (
            <Tooltip key={badge.type}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      'cursor-default gap-1.5 border px-2.5 py-1 text-xs font-semibold',
                      config.colors,
                      config.animation,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {badge.emoji} {badge.label}
                  </Badge>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[220px] border-none bg-primary px-2 py-1 text-center text-[11px] font-medium text-primary-foreground shadow-xl"
              >
                <p>{badge.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {turnoverScore != null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: badges.length * 0.1 }}
              >
                <Badge variant="secondary" className="cursor-default font-mono text-xs">
                  Potencial: {turnoverScore}
                </Badge>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[200px] border-none bg-primary px-2 py-1 text-center text-[11px] font-medium text-primary-foreground shadow-xl"
            >
              <p>
                {turnoverScore >= 80
                  ? 'Alto potencial comercial'
                  : turnoverScore >= 50
                    ? 'Bom potencial comercial'
                    : turnoverScore >= 20
                      ? 'Potencial moderado'
                      : 'Potencial baixo'}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>

      {isDemo && (
        <Badge
          variant="outline"
          className="border-border px-1.5 py-0 text-[10px] text-muted-foreground"
        >
          dados ilustrativos
        </Badge>
      )}
    </div>
  );
}
