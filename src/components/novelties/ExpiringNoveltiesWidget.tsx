import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, Sparkles, ChevronRight, Package } from "lucide-react";
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

function getRecencyColor(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days <= 2) return "text-orange-400";
  if (days <= 5) return "text-amber-400";
  return "text-muted-foreground";
}

export function ExpiringNoveltiesWidget() {
  const navigate = useNavigate();
  const { data: allNovelties, isLoading } = useNoveltiesWithDetails({ limit: 200 });

  // Pega os 10 mais recentes (ordenados por data de criação desc)
  const recentItems = useMemo(() => {
    if (!allNovelties) return [];
    return [...allNovelties]
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
      .slice(0, 10);
  }, [allNovelties]);

  const handleClick = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  return (
    <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400 animate-pulse" />
          <span className="hidden sm:inline">+ Recentes</span>
          <span className="sm:hidden">Recentes</span>
          {recentItems.length > 0 && (
            <Badge 
              variant="secondary" 
              className="bg-orange-500/20 text-orange-400 text-[10px] sm:text-xs"
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
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : recentItems.length > 0 ? (
          <ScrollArea className="h-auto max-h-[300px] lg:max-h-[400px]">
            <div className="space-y-2">
              {recentItems.map((item, idx) => {
                const isVeryNew = idx < 3;
                return (
                  <div
                    key={item.novelty_id}
                    className={cn(
                      "group flex items-center gap-2 sm:gap-3 p-2 rounded-lg cursor-pointer",
                      "bg-background/50 hover:bg-accent/50 transition-colors",
                      isVeryNew 
                        ? "border border-orange-500/20 hover:border-orange-500/40" 
                        : "border border-transparent hover:border-primary/30"
                    )}
                    onClick={() => handleClick(item.product_id)}
                  >
                    {/* Imagem */}
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
                          <Flame className="h-3 w-3 text-orange-400 drop-shadow-sm" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                        {item.product_name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Sparkles className={cn("h-3 w-3", getRecencyColor(item.detected_at))} />
                        <span className={cn("text-[11px] font-medium", getRecencyColor(item.detected_at))}>
                          {formatDaysAgo(item.detected_at)}
                        </span>
                        {item.supplier_name && (
                          <span className="text-[10px] text-muted-foreground/60 ml-1 truncate">
                            · {item.supplier_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
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
  );
}
