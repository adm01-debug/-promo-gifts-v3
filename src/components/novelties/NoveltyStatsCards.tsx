import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Clock, TrendingUp, Package } from "lucide-react";
import { useNoveltyStats } from "@/hooks/useNovelties";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

// Hook para animação de contagem
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
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return count;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant: "success" | "warning" | "info" | "default";
  delay?: number;
}

function StatCard({ label, value, icon, variant, delay = 0 }: StatCardProps) {
  const animatedValue = useCountUp(value, 800);
  
  const variantClasses = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
    default: "bg-primary/10 text-primary",
  };

  return (
    <Card 
      className="border-border/50 hover:border-primary/30 transition-all duration-300"
      style={{ animation: `scale-fade-in 0.4s ease-out ${delay}ms backwards` }}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "shrink-0 p-2 sm:p-2.5 rounded-lg",
            variantClasses[variant]
          )}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold tabular-nums truncate">
              {animatedValue.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {label}
            </p>
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
          <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoveltyStatsCards() {
  const { data: stats, isLoading } = useNoveltyStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Novidades Ativas"
        value={stats?.active_novelties || stats?.products_is_new_true || 0}
        icon={<Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="success"
        delay={0}
      />
      <StatCard
        label="Expirando em 7d"
        value={stats?.expiring_in_7_days || 0}
        icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="warning"
        delay={100}
      />
      <StatCard
        label="Total Produtos"
        value={stats?.total_products || 0}
        icon={<Package className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="info"
        delay={200}
      />
      <StatCard
        label="Taxa Novidades"
        value={stats?.total_products 
          ? Math.round(((stats?.active_novelties || 0) / stats.total_products) * 100) 
          : 0}
        icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="default"
        delay={300}
      />
    </div>
  );
}
