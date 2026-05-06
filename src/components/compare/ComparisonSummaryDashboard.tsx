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

  // Calcular destaques por categoria
  const bestPrice = [...products].sort((a, b) => a.price - b.price)[0];
  const bestStock = [...products].sort((a, b) => (b.stock || 0) - (a.stock || 0))[0];
  const bestVariety = [...products].sort((a, b) => (b.colors?.length || 0) - (a.colors?.length || 0))[0];

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
      <div className="rounded-xl border-[2px] border-amber-400/20 bg-gradient-to-br from-amber-400/5 to-transparent p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-amber-600">
            <TrendingUp className="h-4 w-4" />
            Veredito Global
          </h3>
          <Badge variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-700 border-amber-500/20 uppercase font-black">Ponderado</Badge>
        </div>
        
        {winnerProduct && (
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-display font-black text-amber-500">{winnerScore?.total}</span>
              <span className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-tighter">Índice Global</span>
            </div>
            <p className="text-sm font-bold line-clamp-2 text-foreground/80">{winnerProduct.name}</p>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-black uppercase tracking-widest bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
              <Crown className="h-3 w-3" />
              Líder de Custo-Benefício
            </div>
          </div>
        )}
      </div>

      {/* Coluna 2: Líderes por Categoria */}
      <div className="rounded-xl border-[2px] border-blue-400/20 bg-gradient-to-br from-blue-400/5 to-transparent p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-blue-600">
            <Info className="h-4 w-4" />
            Liderança Técnica
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Melhor Preço:</span>
            <span className="font-bold text-blue-700 truncate max-w-[120px]" title={bestPrice.name}>{bestPrice.name}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Maior Estoque:</span>
            <span className="font-bold text-green-700 truncate max-w-[120px]" title={bestStock.name}>{bestStock.name}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Mais Versátil:</span>
            <span className="font-bold text-purple-700 truncate max-w-[120px]" title={bestVariety.name}>{bestVariety.name}</span>
          </div>
          <div className="pt-2 mt-2 border-t border-blue-400/10">
            {hasBigPriceDiff && (
              <p className="text-[10px] text-blue-600/80 font-medium">
                Destaque: Variação de {Math.round((priceDiff/minPrice)*100)}% em preço.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Coluna 3: Status do Duelo */}
      <div className="rounded-xl border-[2px] border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-destructive">
            <Swords className="h-4 w-4" />
            Arena de Confronto
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