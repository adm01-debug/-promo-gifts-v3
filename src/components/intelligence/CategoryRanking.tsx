import { useState, useMemo } from "react";
import { LayoutGrid, Package, TrendingUp, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCategoryRanking, type CategoryRankingItem } from "@/hooks/useCommercialIntelligence";
import { cn } from "@/lib/utils";

type SortMode = "combined" | "internal" | "market";

interface CategoryRankingProps {
  days?: number;
  categoryId?: string | null;
  supplierId?: string | null;
  productId?: string | null;
  categoryName?: string | null;
}

export function CategoryRanking({ days = 30, categoryId, supplierId, productId, categoryName }: CategoryRankingProps) {
  const [sortMode, setSortMode] = useState<SortMode>("combined");
  const { data: categories, isLoading } = useCategoryRanking(days, categoryId, supplierId, productId);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  const formatNumber = (v: number) =>
    new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v);

  const sortedCategories = useMemo(() => {
    if (!categories?.length) return [];
    const sorted = [...categories];
    switch (sortMode) {
      case "internal":
        return sorted.sort((a, b) => b.internalRevenue - a.internalRevenue);
      case "market":
        return sorted.sort((a, b) => b.marketDepleted - a.marketDepleted);
      default:
        return sorted.sort((a, b) => b.totalScore - a.totalScore);
    }
  }, [categories, sortMode]);

  const getBarValue = (cat: CategoryRankingItem): number => {
    switch (sortMode) {
      case "internal": return cat.internalRevenue;
      case "market": return cat.marketDepleted;
      default: return cat.totalScore;
    }
  };

  const getDisplayValue = (cat: CategoryRankingItem): string => {
    switch (sortMode) {
      case "internal": return formatCurrency(cat.internalRevenue);
      case "market": return `${formatNumber(cat.marketDepleted)} un.`;
      default: return formatCurrency(cat.internalRevenue);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-56" /></CardHeader>
        <CardContent className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
        </CardContent>
      </Card>
    );
  }

  const hasData = sortedCategories.length > 0;
  const maxVal = hasData ? Math.max(...sortedCategories.map(getBarValue)) : 0;

  const barColors = [
    "from-violet-500 to-purple-400",
    "from-blue-500 to-cyan-400",
    "from-emerald-500 to-green-400",
    "from-amber-500 to-yellow-400",
    "from-rose-500 to-pink-400",
    "from-indigo-500 to-blue-400",
    "from-teal-500 to-emerald-400",
    "from-orange-500 to-amber-400",
    "from-fuchsia-500 to-violet-400",
    "from-sky-500 to-blue-400",
  ];

  const medalEmojis = ['🥇', '🥈', '🥉'];

  const modeLabels: Record<SortMode, string> = {
    combined: "Combinado",
    internal: "Receita Interna",
    market: "Volume Mercado",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <LayoutGrid className="h-3.5 w-3.5 text-white" />
              </div>
              🏆 Ranking de Categorias
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {categoryName ? `Sub-categorias de "${categoryName}"` : 'Categorias mais vendidas'} · {modeLabels[sortMode].toLowerCase()} · {days} dias
            </CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={sortMode}
            onValueChange={(v) => v && setSortMode(v as SortMode)}
            className="bg-muted/50 rounded-lg p-0.5"
          >
            <ToggleGroupItem value="combined" className="text-[10px] px-2 py-1 h-6 data-[state=on]:bg-background data-[state=on]:shadow-sm">
              Combinado
            </ToggleGroupItem>
            <ToggleGroupItem value="internal" className="text-[10px] px-2 py-1 h-6 data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1">
              <TrendingUp className="h-2.5 w-2.5" />
              Interno
            </ToggleGroupItem>
            <ToggleGroupItem value="market" className="text-[10px] px-2 py-1 h-6 data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1">
              <Store className="h-2.5 w-2.5" />
              Mercado
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {!hasData ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Sem dados de categorias para o período</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            {sortedCategories.map((cat, i) => {
              const val = getBarValue(cat);
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
              return (
                <Tooltip key={cat.categoryId}>
                  <TooltipTrigger asChild>
                    <div className="space-y-1 cursor-default">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 truncate flex-1 mr-2">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                            i < 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {i < 3 ? medalEmojis[i] : i + 1}
                          </span>
                          <span className="font-medium truncate text-xs">{cat.categoryName}</span>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          {sortMode !== "market" && cat.marketDepleted > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5">
                              <Store className="h-2.5 w-2.5" />
                              {formatNumber(cat.marketDepleted)}
                            </Badge>
                          )}
                          <span className="text-xs font-semibold text-foreground">{getDisplayValue(cat)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                              barColors[i % barColors.length]
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground shrink-0 w-24 text-right">
                          {formatNumber(cat.internalQty)} un. · {cat.internalOrders} ped.
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs space-y-1">
                    <p className="font-semibold">{cat.categoryName}</p>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span>Interno: {formatCurrency(cat.internalRevenue)} ({formatNumber(cat.internalQty)} un.)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Store className="h-3 w-3 text-blue-500" />
                      <span>Mercado (saídas): {formatNumber(cat.marketDepleted)} un.</span>
                    </div>
                    <p className="text-muted-foreground">Score: {cat.totalScore.toFixed(1)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
