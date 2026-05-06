import { ComparisonScoreWeights } from "@/hooks/useComparisonScore";

/**
 * ComparisonSummaryDashboard — Painel de resumo técnico dos resultados.
 * Mostra Score Geral, Atributos que diferenciam e Status do Duelo.
 */
import { Badge } from "@/components/ui/badge";
import { useComparisonScore, DEFAULT_SCORE_WEIGHTS } from "@/hooks/useComparisonScore";
import { Crown, Swords, Info, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonSummaryDashboardProps {
  products: any[];
}

export function ComparisonSummaryDashboard({ products }: ComparisonSummaryDashboardProps) {
  const scores = useComparisonScore(products, DEFAULT_SCORE_WEIGHTS);
  const winnerScore = scores.find(s => s.isWinner);
  const winnerProduct = winnerScore ? products.find(p => String(p.id) === winnerScore.productId) : null;

  if (products.length < 2) return null;

  // Encontrar atributos que mais diferenciam (exemplo: preço e estoque)
  const maxPrice = Math.max(...products.map(p => p.price));
  const minPrice = Math.min(...products.map(p => p.price));
  const priceDiff = maxPrice - minPrice;
  const hasBigPriceDiff = priceDiff > (minPrice * 0.3);

  const maxStock = Math.max(...products.map(p => p.stock));
  const minStock = Math.min(...products.map(p => p.stock));
  const hasBigStockDiff = maxStock > minStock * 2 && maxStock > 50;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Coluna 1: Resultado Geral */}
      <div className="rounded-xl border bg-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Veredito Geral
          </h3>
          <Badge variant="secondary" className="text-[10px]">Ponderado</Badge>
        </div>
        
        {winnerProduct && (
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-display font-bold text-primary">{winnerScore?.total}</span>
              <span className="text-sm text-muted-foreground mb-1">pontos</span>
            </div>
            <p className="text-sm font-medium line-clamp-2">{winnerProduct.name}</p>
            <div className="flex items-center gap-1.5 text-xs text-success font-medium">
              <Crown className="h-3 w-3" />
              Melhor custo-benefício identificado
            </div>
          </div>
        )}
      </div>

      {/* Coluna 2: Diferenciadores Rápidos */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            Insights de Atributos
          </h3>
        </div>
        <div className="space-y-3">
          {hasBigPriceDiff && (
            <div className="flex items-start gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-1" />
              <p><span className="font-bold">Alta variação de preço:</span> diferença de até {Math.round((priceDiff/minPrice)*100)}% entre itens.</p>
            </div>
          )}
          {hasBigStockDiff && (
            <div className="flex items-start gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-orange-500 mt-1" />
              <p><span className="font-bold">Disponibilidade crítica:</span> um dos itens possui estoque significativamente maior.</p>
            </div>
          )}
          {!hasBigPriceDiff && !hasBigStockDiff && (
            <div className="text-xs text-muted-foreground italic">
              Produtos com especificações técnicas e comerciais muito similares.
            </div>
          )}
        </div>
      </div>

      {/* Coluna 3: Status do Duelo */}
      <div className="rounded-xl border bg-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Swords className="h-4 w-4 text-destructive" />
            Status do Confronto
          </h3>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs font-medium">
            {products.length === 2 ? (
              <span className="text-destructive uppercase tracking-wider font-bold">Duelo 1v1 Disponível</span>
            ) : (
              <span className="text-muted-foreground uppercase tracking-wider">Comparação de Grupo ({products.length} itens)</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {products.length === 2 
              ? "Modo Duelo ativo para análise lado a lado detalhada." 
              : "Visualize na galeria sincronizada ou tabela completa."}
          </p>
          <div className={cn(
            "mt-2 text-[10px] font-mono p-1 rounded text-center",
            products.length > 4 ? "bg-amber-100 text-amber-700" : "bg-muted"
          )}>
            {products.length > 4 ? "Atenção: Volume alto de dados no mobile" : "Visualização otimizada"}
          </div>
        </div>
      </div>
    </div>
  );
}