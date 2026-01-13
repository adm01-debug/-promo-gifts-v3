/**
 * SmartSuggestion - IA sugere a técnica ideal baseado no contexto
 * 
 * Analisa produto, quantidade e local para recomendar a melhor opção
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Lightbulb, 
  TrendingDown, 
  Zap, 
  Award,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SelectedTechnique } from '@/types/domain/simulator-wizard';

interface SmartSuggestionProps {
  techniques: SelectedTechnique[];
  quantity: number;
  onSelect: (technique: SelectedTechnique) => void;
}

interface Recommendation {
  technique: SelectedTechnique;
  reason: string;
  score: number;
  badges: { label: string; icon: React.ReactNode; variant: 'best' | 'fast' | 'quality' }[];
}

export function SmartSuggestion({ techniques, quantity, onSelect }: SmartSuggestionProps) {
  if (techniques.length === 0) return null;

  // Filtrar técnicas que atendem ao minQuantity
  const eligibleTechniques = techniques.filter(t => 
    !t.minQuantity || t.minQuantity <= quantity
  );

  if (eligibleTechniques.length === 0) return null;

  // Calcular recomendações baseadas em lógica de negócio
  const getRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    // Encontrar melhor preço (usando técnicas elegíveis)
    const sortedByPrice = [...eligibleTechniques].sort((a, b) => {
      const totalA = a.unitCost * quantity + a.setupCost;
      const totalB = b.unitCost * quantity + b.setupCost;
      return totalA - totalB;
    });

    // Encontrar mais rápido
    const sortedBySpeed = [...eligibleTechniques].sort((a, b) => 
      a.estimatedDays - b.estimatedDays
    );

    // Melhor custo-benefício (preço × tempo)
    const sortedByValue = [...eligibleTechniques].sort((a, b) => {
      const valueA = (a.unitCost * quantity + a.setupCost) * a.estimatedDays;
      const valueB = (b.unitCost * quantity + b.setupCost) * b.estimatedDays;
      return valueA - valueB;
    });

    const bestPrice = sortedByPrice[0];
    const fastest = sortedBySpeed[0];
    const bestValue = sortedByValue[0];

    // Adicionar recomendação principal (melhor custo-benefício)
    if (bestValue) {
      const badges: Recommendation['badges'] = [
        { label: 'Recomendado', icon: <Award className="h-3.5 w-3.5" />, variant: 'quality' }
      ];
      
      if (bestValue.id === bestPrice.id) {
        badges.push({ label: 'Melhor Preço', icon: <TrendingDown className="h-3.5 w-3.5" />, variant: 'best' });
      }
      if (bestValue.id === fastest.id) {
        badges.push({ label: 'Mais Rápido', icon: <Zap className="h-3.5 w-3.5" />, variant: 'fast' });
      }

      let reason = `Ideal para ${quantity} unidades`;
      if (quantity >= 500) {
        reason = 'Excelente economia em escala';
      } else if (quantity <= 50) {
        reason = 'Perfeito para pequenas quantidades';
      }

      recommendations.push({
        technique: bestValue,
        reason,
        score: 95,
        badges,
      });
    }

    // Alternativa mais econômica (se diferente)
    if (bestPrice && bestPrice.id !== bestValue?.id) {
      recommendations.push({
        technique: bestPrice,
        reason: 'Opção mais econômica disponível',
        score: 88,
        badges: [
          { label: 'Melhor Preço', icon: <TrendingDown className="h-3.5 w-3.5" />, variant: 'best' }
        ],
      });
    }

    // Alternativa mais rápida (se diferente)
    if (fastest && fastest.id !== bestValue?.id && fastest.id !== bestPrice?.id) {
      recommendations.push({
        technique: fastest,
        reason: 'Entrega mais ágil',
        score: 82,
        badges: [
          { label: 'Mais Rápido', icon: <Zap className="h-3.5 w-3.5" />, variant: 'fast' }
        ],
      });
    }

    return recommendations.slice(0, 2); // Máximo 2 sugestões
  };

  const recommendations = getRecommendations();

  if (recommendations.length === 0) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
          <Sparkles className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h4 className="font-bold text-sm">Sugestão Inteligente</h4>
          <p className="text-xs text-muted-foreground">Baseado no seu contexto</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        {recommendations.map((rec, idx) => {
          const total = rec.technique.unitCost * quantity + rec.technique.setupCost;
          
          return (
            <motion.div
              key={rec.technique.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                'relative p-4 rounded-2xl border-2 transition-all cursor-pointer group',
                idx === 0
                  ? 'bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-violet-500/5 border-violet-500/30 hover:border-violet-500/50'
                  : 'bg-card border-muted hover:border-primary/30'
              )}
              onClick={() => onSelect(rec.technique)}
            >
              {/* Glow effect for primary recommendation */}
              {idx === 0 && (
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-2xl blur-xl" />
              )}

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {rec.badges.map((badge, i) => (
                      <Badge
                        key={i}
                        className={cn(
                          'gap-1 text-xs border-0',
                          badge.variant === 'best' && 'bg-amber-500/10 text-amber-600',
                          badge.variant === 'fast' && 'bg-blue-500/10 text-blue-600',
                          badge.variant === 'quality' && 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                        )}
                      >
                        {badge.icon}
                        {badge.label}
                      </Badge>
                    ))}
                    {idx === 0 && (
                      <span className="text-xs font-bold text-violet-600">{rec.score}% match</span>
                    )}
                  </div>
                  <p className="font-bold text-lg">{rec.technique.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5" />
                    {rec.reason}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                  <p className="text-xs text-muted-foreground">~{rec.technique.estimatedDays} dias</p>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
