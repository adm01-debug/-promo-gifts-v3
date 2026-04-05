import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Clock, ChevronRight, Filter, Package } from "lucide-react";
import { useNovelties, useNoveltyStats } from "@/hooks/useNovelties";
import { NoveltyBadge } from "@/components/products/NoveltyBadge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// CountUp animation hook
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }
    
    let startTime: number | null = null;
    const startValue = 0;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (end - startValue) * easeOutQuart);
      
      setCount(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return count;
}

interface NoveltyCardProps {
  novelty: {
    novelty_id: string;
    product_id: string;
    product_name: string;
    product_sku: string | null;
    supplier_code: string | null;
    days_remaining: number;
    detected_at: string;
  };
  onClick?: () => void;
}

function NoveltyCard({ novelty, onClick }: NoveltyCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        "border-border/50 hover:border-primary/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header com badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <NoveltyBadge 
            daysRemaining={novelty.days_remaining} 
            size="sm"
          />
        </div>

        {/* Imagem placeholder */}
        <div className="aspect-square bg-gradient-to-br from-secondary/50 to-muted/30 rounded-lg mb-3 flex items-center justify-center">
          <Package className="h-12 w-12 text-muted-foreground/30" />
        </div>

        {/* Info do produto */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {novelty.product_name}
          </h4>
          
          {novelty.product_sku && (
            <p className="text-xs text-muted-foreground">
              SKU: {novelty.product_sku}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {novelty.days_remaining}d restantes
            </span>
            {novelty.supplier_code && (
              <Badge variant="secondary" className="text-[10px]">
                {novelty.supplier_code}
              </Badge>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/70">
            Detectado em {formatDate(novelty.detected_at)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function NoveltyCardSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="aspect-square rounded-lg mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface NoveltyStatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info";
  delay?: number;
}

function NoveltyStatCard({ label, value, icon, variant = "default", delay = 0 }: NoveltyStatCardProps) {
  const animatedValue = useCountUp(value, 800);
  
  const getVariantClasses = () => {
    switch (variant) {
      case "success":
        return "bg-success/10 text-success";
      case "warning":
        return "bg-warning/10 text-warning";
      case "info":
        return "bg-info/10 text-info";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border border-transparent hover:border-border/50 transition-all duration-300",
        getVariantClasses()
      )}
      style={{ 
        animation: `scale-fade-in 0.4s ease-out ${delay}ms backwards`
      }}
    >
      <div className="shrink-0 p-2 rounded-lg bg-current/10">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{animatedValue.toLocaleString('pt-BR')}</p>
        <p className="text-xs opacity-80 font-medium">{label}</p>
      </div>
    </div>
  );
}

export function NoveltiesSection() {
  const navigate = useNavigate();
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  // Calcular maxDays baseado no período
  const maxDays = periodFilter === "7" ? 7 : periodFilter === "15" ? 15 : undefined;

  const { data: novelties, isLoading } = useNovelties({
    supplierCode: supplierFilter !== "all" ? supplierFilter : undefined,
    maxDays,
    limit: 8,
  });

  const { data: stats } = useNoveltyStats();

  // Extrair fornecedores únicos das estatísticas
  const suppliers = stats?.by_supplier ? Object.keys(stats.by_supplier) : [];

  const handleProductClick = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-success to-success/80 text-primary-foreground shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Novidades
                {stats && (
                  <Badge variant="secondary" className="text-xs">
                    {stats.active_novelties} produtos
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Lançamentos dos últimos 30 dias
              </CardDescription>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de período */}
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos (30d)</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de fornecedor */}
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats resumidas */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <NoveltyStatCard
              label="Novidades ativas"
              value={stats.active_novelties}
              icon={<Sparkles className="h-5 w-5" />}
              variant="success"
              delay={100}
            />
            <NoveltyStatCard
              label="Expirando em 7d"
              value={stats.expiring_soon}
              icon={<Clock className="h-5 w-5" />}
              variant="warning"
              delay={200}
            />
            <NoveltyStatCard
              label="Fornecedores"
              value={Object.keys(stats.by_supplier || {}).length}
              icon={<Package className="h-5 w-5" />}
              delay={300}
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <NoveltyCardSkeleton key={i} />
            ))}
          </div>
        ) : novelties && novelties.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {novelties.map((novelty, index) => (
                <div 
                  key={novelty.novelty_id}
                  className="stagger-item"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <NoveltyCard
                    novelty={novelty}
                    onClick={() => handleProductClick(novelty.product_id)}
                  />
                </div>
              ))}
            </div>

            {/* Link para ver todas */}
            <div className="flex justify-center mt-6">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => navigate('/filtros?novidades=true')}
              >
                Ver todas as novidades
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Nenhuma novidade encontrada com os filtros aplicados
            </p>
            {(supplierFilter !== "all" || periodFilter !== "all") && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => {
                  setSupplierFilter("all");
                  setPeriodFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
