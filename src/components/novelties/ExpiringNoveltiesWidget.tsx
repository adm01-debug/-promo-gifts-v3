import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Flame, Sparkles, ChevronRight, Package, Building2 } from "lucide-react";
import { useNoveltiesWithDetails } from "@/hooks/useNovelties";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function formatDaysAgo(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days === 0) return "Hoje!";
  if (days === 1) return "Ontem";
  return `${days}d atrás`;
}

function getRecencyVariant(createdAt: string): "hot" | "warm" | "normal" {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days <= 2) return "hot";
  if (days <= 5) return "warm";
  return "normal";
}

const recencyStyles = {
  hot: "text-orange",
  warm: "text-warning",
  normal: "text-muted-foreground",
};

interface SupplierBreakdown {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

export function ExpiringNoveltiesWidget() {
  const navigate = useNavigate();
  const { data: allNovelties, isLoading } = useNoveltiesWithDetails({ limit: 200 });

  const recentItems = useMemo(() => {
    if (!allNovelties) return [];
    return [...allNovelties]
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
      .slice(0, 10);
  }, [allNovelties]);

  // Supplier breakdown
  const supplierBreakdown = useMemo<SupplierBreakdown[]>(() => {
    if (!allNovelties || allNovelties.length === 0) return [];
    const supMap = new Map<string, { id: string; name: string; count: number }>();
    allNovelties.forEach(p => {
      if (p.supplier_id && p.supplier_name) {
        const existing = supMap.get(p.supplier_id);
        if (existing) existing.count++;
        else supMap.set(p.supplier_id, { id: p.supplier_id, name: p.supplier_name, count: 1 });
      }
    });
    const total = allNovelties.length;
    return [...supMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(s => ({ ...s, percentage: Math.round((s.count / total) * 100) }));
  }, [allNovelties]);

  const handleClick = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  return (
    <div className="space-y-4">
      {/* + Recentes widget */}
      <Card className="border-orange/30 bg-gradient-to-br from-orange/5 to-transparent">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange animate-pulse" />
            <span className="hidden sm:inline">+ Recentes</span>
            <span className="sm:hidden">Recentes</span>
            {recentItems.length > 0 && (
              <Badge 
                variant="secondary" 
                className="bg-orange/20 text-orange text-[10px] sm:text-xs tabular-nums"
              >
                {recentItems.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded shimmer" style={{ animationDelay: `${i * 100}ms` }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-full rounded shimmer" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                    <div className="h-3 w-16 rounded shimmer" style={{ animationDelay: `${i * 100 + 100}ms` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : recentItems.length > 0 ? (
            <ScrollArea className="h-auto max-h-[300px] lg:max-h-[400px]">
              <div className="space-y-2">
                {recentItems.map((item, idx) => {
                  const isVeryNew = idx < 3;
                  const variant = getRecencyVariant(item.detected_at);
                  return (
                    <div
                      key={item.novelty_id}
                      className={cn(
                        "group flex items-center gap-2 sm:gap-3 p-2 rounded-lg cursor-pointer",
                        "bg-background/50 hover:bg-accent/50 transition-all duration-200",
                        isVeryNew 
                          ? "border border-orange/20 hover:border-orange/40" 
                          : "border border-transparent hover:border-primary/30",
                        variant === "hot" && "shadow-[inset_0_0_0_1px_hsl(var(--orange)/0.1)]"
                      )}
                      onClick={() => handleClick(item.product_id)}
                    >
                      <div className="shrink-0 w-10 h-10 rounded bg-muted overflow-hidden relative">
                        {item.product_image ? (
                          <img src={item.product_image} 
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        {isVeryNew && (
                          <div className="absolute -top-1 -right-1">
                            <Flame className="h-3 w-3 text-orange drop-shadow-sm" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                          {item.product_name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Sparkles className={cn("h-3 w-3", recencyStyles[variant])} />
                          <span className={cn("text-[11px] font-medium", recencyStyles[variant])}>
                            {formatDaysAgo(item.detected_at)}
                          </span>
                          {item.supplier_name && (
                            <span className="text-[10px] text-muted-foreground/60 ml-1 truncate">
                              · {item.supplier_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                Nenhuma novidade recente encontrada
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Breakdown widget */}
      {supplierBreakdown.length > 0 && (
        <Card className="border-info/30 bg-gradient-to-br from-info/5 to-transparent">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
              <span>Por Fornecedor</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2.5">
              {supplierBreakdown.map((sup, idx) => (
                <div key={sup.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-xs truncate max-w-[140px]">{sup.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] tabular-nums px-1.5 py-0">
                        {sup.count}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                        {sup.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        idx === 0 ? "bg-info" : "bg-info/50"
                      )}
                      style={{ 
                        width: `${sup.percentage}%`,
                        animationDelay: `${idx * 100}ms`,
                      }}
                    />
                  </div>
                  {idx < supplierBreakdown.length - 1 && (
                    <Separator className="mt-2.5 opacity-30" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
