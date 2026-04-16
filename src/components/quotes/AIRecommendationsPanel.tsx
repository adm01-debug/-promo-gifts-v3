/**
 * AIRecommendationsPanel — Painel de recomendações IA no fluxo de orçamento.
 * Carrega produtos automaticamente e usa o perfil do cliente para sugerir itens.
 */
import { useState, useMemo, useCallback } from "react";
import { Sparkles, Loader2, RefreshCw, Plus, Lightbulb, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAIRecommendations, type ClientProfile, type ProductForRecommendation, type Recommendation } from "@/hooks/useAIRecommendations";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface AIRecommendationsPanelProps {
  clientName?: string;
  clientCompany?: string;
  clientIndustry?: string;
  /** Already-added product IDs to filter out */
  addedProductIds?: string[];
  /** Called when user wants to add a recommended product by ID */
  onAddProduct?: (productId: string, productName: string) => void;
  className?: string;
}

export function AIRecommendationsPanel({
  clientName,
  clientCompany,
  clientIndustry,
  addedProductIds = [],
  onAddProduct,
  className,
}: AIRecommendationsPanelProps) {
  const { recommendations, insights, isLoading, error, fetchRecommendations, clearCache } = useAIRecommendations();
  const [hasRequested, setHasRequested] = useState(false);

  // Pre-load a sample of products for recommendations
  const { data: catalogProducts } = useQuery({
    queryKey: ["ai-rec-catalog-sample"],
    queryFn: async () => {
      const { fetchPromobrindProducts } = await import("@/lib/external-db");
      const products = await fetchPromobrindProducts({ limit: 80 });
      return products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category_name || "Brindes",
        description: p.short_description || undefined,
      })) as ProductForRecommendation[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const canRequest = !!clientName && (catalogProducts?.length ?? 0) > 0;

  const filteredRecommendations = useMemo(
    () => recommendations.filter((r) => !addedProductIds.includes(r.productId)),
    [recommendations, addedProductIds]
  );

  // Map productId -> name from catalog for display
  const productNameMap = useMemo(() => {
    const map = new Map<string, string>();
    catalogProducts?.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [catalogProducts]);

  const handleRequest = useCallback(async () => {
    if (!clientName || !catalogProducts?.length) return;

    const client: ClientProfile = {
      name: clientName,
      company: clientCompany,
      industry: clientIndustry,
    };

    await fetchRecommendations(client, catalogProducts);
    setHasRequested(true);
  }, [clientName, clientCompany, clientIndustry, catalogProducts, fetchRecommendations]);

  const handleRefresh = useCallback(async () => {
    clearCache();
    await handleRequest();
  }, [clearCache, handleRequest]);

  // Collapsed state — not yet requested
  if (!hasRequested && !isLoading) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4", className)}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm">Recomendações IA</h3>
            <p className="text-[11px] text-muted-foreground leading-none">
              Sugestões inteligentes para este cliente
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full mt-1 gap-1.5 text-xs"
          disabled={!canRequest}
          onClick={handleRequest}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {canRequest ? "Gerar Recomendações" : "Selecione um cliente primeiro"}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card p-4 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-sm">Recomendações IA</h3>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Atualizar recomendações</TooltipContent>
        </Tooltip>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center py-6 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Analisando perfil do cliente...</p>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium">Erro ao gerar recomendações</p>
            <p className="text-[11px] opacity-80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Recommendations list */}
      {!isLoading && !error && (
        <AnimatePresence mode="popLayout">
          {filteredRecommendations.length > 0 ? (
            <div className="space-y-2">
              {filteredRecommendations.map((rec, i) => (
                <RecommendationCard
                  key={rec.productId}
                  recommendation={rec}
                  productName={productNameMap.get(rec.productId) || rec.productId}
                  index={i}
                  onAdd={() => onAddProduct?.(rec.productId, productNameMap.get(rec.productId) || rec.productId)}
                />
              ))}
            </div>
          ) : hasRequested && recommendations.length > 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Todos os produtos recomendados já foram adicionados 🎉
            </p>
          ) : null}
        </AnimatePresence>
      )}

      {/* Insights */}
      {insights && !isLoading && (
        <div className="p-2.5 rounded-lg bg-muted/50 border border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb className="h-3 w-3 text-warning" />
            <span className="text-[11px] font-medium text-muted-foreground">Insight da IA</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{insights}</p>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  productName,
  index,
  onAdd,
}: {
  recommendation: Recommendation;
  productName: string;
  index: number;
  onAdd: () => void;
}) {
  const scoreColor = recommendation.score >= 0.8
    ? "text-success bg-success/10"
    : recommendation.score >= 0.5
    ? "text-warning bg-warning/10"
    : "text-muted-foreground bg-muted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className="group flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0 mt-0.5", scoreColor)}>
        {Math.round(recommendation.score * 100)}%
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{productName}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{recommendation.reason}</p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={onAdd}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Adicionar ao orçamento</TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
