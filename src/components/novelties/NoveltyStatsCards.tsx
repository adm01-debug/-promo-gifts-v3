import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  CalendarPlus,
  CalendarRange,
  CalendarDays,
  Building2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useNoveltyStats } from '@/hooks/useNovelties';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

function useCountUp(end: number, duration: number = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(end * easeOutQuart));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  return count;
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'info' | 'default' | 'orange';
  delay?: number;
}

const variantStyles = {
  success: {
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--success)/0.15)]',
  },
  warning: {
    iconBg: 'bg-warning/15',
    iconColor: 'text-warning',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--warning)/0.15)]',
  },
  info: {
    iconBg: 'bg-info/15',
    iconColor: 'text-info',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--info)/0.15)]',
  },
  default: {
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
  },
  orange: {
    iconBg: 'bg-orange/15',
    iconColor: 'text-orange',
    glow: 'hover:shadow-[0_0_20px_hsl(var(--orange)/0.15)]',
  },
};

function StatCard({
  label,
  value,
  suffix = '',
  subtitle,
  icon,
  variant,
  delay = 0,
  isLoading = false,
}: StatCardProps & { isLoading?: boolean }) {
  const animatedValue = useCountUp(value, 800);
  const styles = variantStyles[variant];

  if (isLoading) {
    return (
      <Card className={cn('border-border/50 transition-all duration-300', styles.glow)}>
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex items-center gap-2.5">
            <Skeleton
              className={cn('h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-10', styles.iconBg)}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'border-border/50 transition-all duration-300 hover:border-primary/30',
        styles.glow,
      )}
      style={{ animation: `scale-fade-in 0.4s ease-out ${delay}ms backwards` }}
    >
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('shrink-0 rounded-xl p-2', styles.iconBg)}>{icon}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold tabular-nums leading-tight sm:text-xl">
              {animatedValue.toLocaleString('pt-BR')}
              {suffix}
            </p>
            <p className="truncate text-[10px] leading-tight text-muted-foreground sm:text-xs">
              {label}
            </p>
            {subtitle && (
              <p className="mt-0.5 truncate text-[9px] leading-tight text-muted-foreground/70">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="shimmer h-10 w-10 rounded-xl sm:h-11 sm:w-11" />
          <div className="space-y-2">
            <div className="shimmer h-6 w-16 rounded" style={{ animationDelay: '100ms' }} />
            <div className="shimmer h-4 w-24 rounded" style={{ animationDelay: '200ms' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoveltyStatsCards({
  filteredProducts,
  isRefreshing = false,
}: {
  filteredProducts?: any[];
  isRefreshing?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: stats, isLoading, error, refetch } = useNoveltyStats(filteredProducts);
  const isActuallyLoading = isLoading || isRefreshing;

  const handleRetry = () => {
    refetch();
  };

  if (error && !stats) {
    return (
      <Card className="overflow-hidden border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-destructive">
                Falha ao carregar indicadores
              </h4>
              <p className="text-xs text-muted-foreground">
                Não foi possível processar as estatísticas de novidades neste momento.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleRetry}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !stats) {
    return (
      <div className="relative grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 transition-opacity duration-300 sm:gap-4 lg:grid-cols-5',
        isRefreshing && 'pointer-events-none opacity-60',
      )}
    >
      {isRefreshing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-full border border-border bg-background/80 p-3 shadow-lg backdrop-blur-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      )}
      <StatCard
        label="Chegaram Hoje"
        value={stats?.arrivedToday || 0}
        icon={<CalendarPlus className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="orange"
        delay={0}
        isLoading={isActuallyLoading}
      />
      <StatCard
        label="Últimos 7 Dias"
        value={stats?.arrivedThisWeek || 0}
        icon={<CalendarRange className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="success"
        delay={100}
        isLoading={isActuallyLoading}
      />
      <StatCard
        label="Últimos 15 Dias"
        value={stats?.arrivedLast15Days || 0}
        icon={<CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="warning"
        delay={150}
        isLoading={isActuallyLoading}
      />
      <StatCard
        label="Top Fornecedor"
        value={stats?.topSupplierCount || 0}
        subtitle={stats?.topSupplierName || '—'}
        icon={<Building2 className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="info"
        delay={200}
        isLoading={isActuallyLoading}
      />
      <StatCard
        label="Novidades Ativas"
        value={stats?.activeNovelties || 0}
        suffix={stats?.noveltyRate ? ` (${stats.noveltyRate}%)` : ''}
        icon={<Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="default"
        delay={300}
        isLoading={isActuallyLoading}
      />
    </div>
  );
}
