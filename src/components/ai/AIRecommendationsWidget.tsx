import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Brain, RefreshCw, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  price?: number;
  image_url?: string;
  tags?: string[];
}

interface AIRecommendationsWidgetProps {
  clientName?: string;
  clientCompany?: string;
  clientIndustry?: string;
  availableProducts: Product[];
  onAddProduct?: (productId: string) => void;
  className?: string;
}

export function AIRecommendationsWidget({
  clientName,
  clientCompany,
  clientIndustry,
  availableProducts,
  onAddProduct,
  className,
}: AIRecommendationsWidgetProps) {
  const { data, isLoading, error, fetchRecommendations, reset } = useAIRecommendations();
  const [hasRequested, setHasRequested] = useState(false);

  const handleGenerate = async () => {
    const client = {
      name: clientName || "Cliente",
      company: clientCompany,
      industry: clientIndustry,
    };

    const products = availableProducts.slice(0, 50).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category || "Geral",
      description: p.description,
      priceRange: p.price ? `R$ ${p.price.toFixed(2)}` : undefined,
      tags: p.tags,
    }));

    setHasRequested(true);
    await fetchRecommendations(client, products);
  };

  const matchedProducts = useMemo(() => {
    if (!data?.recommendations) return [];

    return data.recommendations
      .map((rec) => {
        const product = availableProducts.find((p) => p.id === rec.productId);
        return product ? { ...rec, product } : null;
      })
      .filter(Boolean) as Array<{
      productId: string;
      score: number;
      reason: string;
      product: Product;
    }>;
  }, [data, availableProducts]);

  if (!hasRequested) {
    return (
      <Card className={cn("border-dashed border-primary/30 bg-primary/5", className)}>
        <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">Recomendações por IA</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sugere os melhores produtos para{" "}
              {clientName || "este cliente"} com base no perfil e catálogo
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isLoading || availableProducts.length === 0}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Gerar Recomendações
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Analisando perfil...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive/30", className)}>
        <CardContent className="flex flex-col items-center py-6 gap-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-muted-foreground text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-2">
            <RefreshCw className="h-3 w-3" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Recomendações IA
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              reset();
              handleGenerate();
            }}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {matchedProducts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma recomendação encontrada para este perfil
          </p>
        ) : (
          matchedProducts.map((rec) => (
            <div
              key={rec.productId}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              {rec.product.image_url ? (
                <img
                  src={rec.product.image_url}
                  alt={rec.product.name}
                  className="h-10 w-10 rounded object-cover bg-muted"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{rec.product.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {rec.reason}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    rec.score >= 90
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : rec.score >= 70
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-muted"
                  )}
                >
                  {Math.round(rec.score)}%
                </Badge>
                {onAddProduct && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onAddProduct(rec.productId)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        {data?.insights && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 {data.insights}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
