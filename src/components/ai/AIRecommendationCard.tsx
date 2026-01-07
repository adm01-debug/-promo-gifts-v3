import { motion } from "framer-motion";
import { Sparkles, TrendingUp, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIRecommendationCardProps {
  rank: number;
  productName: string;
  productImage?: string;
  category: string;
  matchScore: number;
  reason: string;
  tags?: string[];
  price?: number;
  onSelect?: () => void;
  onQuickAdd?: () => void;
  className?: string;
}

export function AIRecommendationCard({
  rank,
  productName,
  productImage,
  category,
  matchScore,
  reason,
  tags = [],
  price,
  onSelect,
  onQuickAdd,
  className,
}: AIRecommendationCardProps) {
  const getScoreGradient = (score: number) => {
    if (score >= 90) return "from-emerald-500 to-green-600";
    if (score >= 75) return "from-blue-500 to-indigo-600";
    if (score >= 60) return "from-amber-500 to-orange-600";
    return "from-gray-500 to-gray-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excelente";
    if (score >= 75) return "Ótimo";
    if (score >= 60) return "Bom";
    return "Sugerido";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:shadow-lg hover:border-primary/30",
        className
      )}
    >
      {/* Rank badge */}
      <div className="absolute -top-1 -left-1">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-br-xl rounded-tl-lg text-white font-bold text-sm",
            rank === 1 && "bg-gradient-to-br from-yellow-400 to-amber-500",
            rank === 2 && "bg-gradient-to-br from-gray-300 to-gray-400",
            rank === 3 && "bg-gradient-to-br from-amber-600 to-amber-700",
            rank > 3 && "bg-gradient-to-br from-muted to-muted-foreground/50"
          )}
        >
          {rank <= 3 ? <Star className="h-4 w-4 fill-current" /> : rank}
        </div>
      </div>

      {/* AI badge */}
      <div className="absolute top-2 right-2">
        <Badge
          variant="secondary"
          className="gap-1 text-[10px] bg-primary/10 text-primary border-primary/20"
        >
          <Sparkles className="h-3 w-3" />
          AI
        </Badge>
      </div>

      <div className="flex gap-4 pt-2">
        {/* Product image */}
        <div className="relative w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <TrendingUp className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">{category}</p>
            <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {productName}
            </h4>
          </div>

          {/* Score bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Match</span>
              <span className="font-semibold">{matchScore}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${matchScore}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={cn(
                  "h-full rounded-full bg-gradient-to-r",
                  getScoreGradient(matchScore)
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reason */}
      <div className="mt-3 p-2 rounded-lg bg-muted/50 border border-border/50">
        <p className="text-xs text-muted-foreground line-clamp-2">
          <span className="font-medium text-foreground">Por que: </span>
          {reason}
        </p>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1.5">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        {price && (
          <span className="text-sm font-semibold text-primary">
            R$ {price.toFixed(2)}
          </span>
        )}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onQuickAdd}
        >
          Adicionar
        </Button>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={onSelect}>
          Ver
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Score label */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Badge
          className={cn(
            "bg-gradient-to-r text-white border-0",
            getScoreGradient(matchScore)
          )}
        >
          {getScoreLabel(matchScore)}
        </Badge>
      </motion.div>
    </motion.div>
  );
}
