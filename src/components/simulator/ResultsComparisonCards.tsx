/**
 * ResultsComparisonCards - Cards Visuais de Resultado
 * Winner/Runner-up com destaque visual claro
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, 
  Medal,
  Zap, 
  Clock,
  DollarSign,
  TrendingDown,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import { NicheRecommendationBadge } from "./NicheRecommendationBadge";
import { MockupPreview } from "./MockupPreview";
import type { SimulationOption, Product } from "@/types/simulation";

interface ResultsComparisonCardsProps {
  options: SimulationOption[];
  bestOption: SimulationOption | null;
  fastestOption: SimulationOption | null;
  quantity: number;
  onSelectForQuote?: (option: SimulationOption) => void;
  // Novos props para integrações
  selectedProduct?: Product;
  clientRamo?: string | null;
  clientNicho?: string | null;
  clientLogoUrl?: string | null;
}

export function ResultsComparisonCards({
  options,
  bestOption,
  fastestOption,
  quantity,
  onSelectForQuote,
  selectedProduct,
  clientRamo,
  clientNicho,
  clientLogoUrl,
}: ResultsComparisonCardsProps) {
  const [showAll, setShowAll] = useState(false);
  
  if (options.length === 0) return null;

  // Ordenar por custo total
  const sortedOptions = [...options].sort((a, b) => a.grandTotal - b.grandTotal);
  
  // Winner e runners-up
  const winner = sortedOptions[0];
  const runnerUp = sortedOptions[1];
  const others = sortedOptions.slice(2);
  
  // Calcular métricas comparativas
  const maxCost = Math.max(...options.map(o => o.grandTotal));
  const minCost = Math.min(...options.map(o => o.grandTotal));
  const maxDays = Math.max(...options.map(o => o.estimatedDays));
  const minDays = Math.min(...options.map(o => o.estimatedDays));

  // Função para calcular score visual (0-100)
  const getCostScore = (cost: number) => {
    if (maxCost === minCost) return 100;
    return Math.round(100 - ((cost - minCost) / (maxCost - minCost)) * 100);
  };

  const getSpeedScore = (days: number) => {
    if (maxDays === minDays) return 100;
    return Math.round(100 - ((days - minDays) / (maxDays - minDays)) * 100);
  };

  // Card de destaque (Winner/Runner-up)
  const HighlightCard = ({ 
    option, 
    rank, 
    isWinner = false 
  }: { 
    option: SimulationOption; 
    rank: number;
    isWinner?: boolean;
  }) => {
    const isFastest = option.id === fastestOption?.id;
    const costScore = getCostScore(option.grandTotal);
    const speedScore = getSpeedScore(option.estimatedDays);
    const savingsVsMax = maxCost - option.grandTotal;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: rank * 0.1 }}
        className="relative"
      >
        <Card className={cn(
          "overflow-hidden transition-all duration-300 hover:shadow-lg",
          isWinner 
            ? "border-2 border-success bg-gradient-to-br from-success/10 via-success/5 to-transparent" 
            : "border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
        )}>
          {/* Ribbon */}
          <div className={cn(
            "absolute top-0 right-0 px-4 py-1 text-xs font-bold text-primary-foreground",
            isWinner ? "bg-success" : "bg-primary"
          )}>
            {isWinner ? (
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" /> MELHOR ESCOLHA
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Medal className="h-3 w-3" /> 2º LUGAR
              </span>
            )}
          </div>
          
          <CardContent className="pt-10 pb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Left: Technique Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">{option.techniqueName}</h3>
                  {/* Melhoria #3: Recomendação por nicho */}
                  <NicheRecommendationBadge
                    techniqueCode={option.techniqueCode}
                    clientRamo={clientRamo}
                    clientNicho={clientNicho}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {isFastest && (
                    <Badge variant="outline" className="text-primary border-primary/50 gap-1">
                      <Zap className="h-3 w-3" /> Mais Rápido
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" /> {option.estimatedDays} dias
                  </Badge>
                  {savingsVsMax > 0 && (
                    <Badge variant="outline" className="text-success border-success/50 gap-1">
                      <TrendingDown className="h-3 w-3" /> Economia: {formatCurrency(savingsVsMax)}
                    </Badge>
                  )}
                  {/* Melhoria #4: Preview de mockup */}
                  {selectedProduct && (
                    <MockupPreview
                      option={option}
                      product={selectedProduct}
                      clientLogoUrl={clientLogoUrl}
                    />
                  )}
                </div>
                
                {/* Score Bars */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Custo-benefício
                      </span>
                      <span className="font-medium">{costScore}%</span>
                    </div>
                    <Progress value={costScore} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Velocidade
                      </span>
                      <span className="font-medium">{speedScore}%</span>
                    </div>
                    <Progress value={speedScore} className="h-2" />
                  </div>
                </div>
              </div>
              
              {/* Right: Pricing */}
              <div className={cn(
                "flex flex-col items-end p-4 rounded-xl",
                isWinner ? "bg-success/10" : "bg-primary/10"
              )}>
                <span className="text-xs text-muted-foreground mb-1">Total</span>
                <span className={cn(
                  "text-3xl font-bold",
                  isWinner ? "text-success" : "text-primary"
                )}>
                  {formatCurrency(option.grandTotal)}
                </span>
                <span className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(option.grandTotalPerUnit)}/un
                </span>
                
                <Button 
                  size="sm" 
                  className="mt-4 gap-2"
                  variant={isWinner ? "default" : "outline"}
                  onClick={() => onSelectForQuote?.(option)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Usar no Orçamento
                </Button>
              </div>
            </div>
            
            {/* Breakdown */}
            <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4 text-center text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Produto</span>
                <span className="font-medium">{formatCurrency(option.totalProductCost)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Personalização</span>
                <span className="font-medium">{formatCurrency(option.totalPersonalizationCost)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Setup</span>
                <span className="font-medium">{formatCurrency(option.setupCost)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Pers./Un</span>
                <span className="font-medium">{formatCurrency(option.costPerUnit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Card compacto para outras opções
  const CompactCard = ({ 
    option, 
    rank 
  }: { 
    option: SimulationOption; 
    rank: number;
  }) => {
    const isFastest = option.id === fastestOption?.id;
    const costScore = getCostScore(option.grandTotal);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: rank * 0.05 }}
      >
        <Card className="hover:border-primary/50 transition-all cursor-pointer group">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {/* Rank Badge */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold text-sm">
                {rank}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{option.techniqueName}</span>
                  {isFastest && (
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {option.estimatedDays}d
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> {formatCurrency(option.grandTotalPerUnit)}/un
                  </span>
                </div>
              </div>
              
              {/* Score */}
              <div className="text-right">
                <span className="text-lg font-bold">{formatCurrency(option.grandTotal)}</span>
                <Progress value={costScore} className="h-1 w-20 mt-1" />
              </div>
              
              {/* Action */}
              <Button 
                size="sm" 
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onSelectForQuote?.(option)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Ranking de Opções</h3>
          <Badge variant="secondary">{options.length} técnicas</Badge>
        </div>
      </div>

      {/* Winner & Runner-up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HighlightCard option={winner} rank={1} isWinner />
        {runnerUp && <HighlightCard option={runnerUp} rank={2} />}
      </div>

      {/* Other Options */}
      {others.length > 0 && (
        <AnimatePresence>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full justify-center gap-2 text-muted-foreground"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Ocultar outras {others.length} opções
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Ver outras {others.length} opções
                </>
              )}
            </Button>
            
            {showAll && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {others.map((option, idx) => (
                  <CompactCard 
                    key={option.id} 
                    option={option} 
                    rank={idx + 3} 
                  />
                ))}
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
