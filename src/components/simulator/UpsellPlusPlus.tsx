// src/components/simulator/UpsellPlusPlus.tsx
/**
 * Upsell++ - Sugestões Inteligentes Avançadas
 * 
 * Features:
 * - Múltiplos cenários com ROI calculado
 * - Técnica alternativa mais barata
 * - "Clientes similares compraram X" (simulação ML)
 * - Promoções ativas com urgência
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Clock,
  Users,
  Zap,
  Calculator,
  Target,
  BarChart3,
  Tag,
  Flame,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SimulationOption, Technique } from "@/types/simulation";

interface UpsellPlusPlusProps {
  currentQuantity: number;
  productPrice: number;
  bestOption: SimulationOption | null;
  allOptions: SimulationOption[];
  techniques: Technique[] | undefined;
  selectedTechniques: string[];
  onQuantityChange: (qty: number) => void;
  onTechniqueChange: (techniqueId: string) => void;
  clientRamo?: string | null;
  clientNicho?: string | null;
}

// Breakpoints de quantidade
const QUANTITY_BREAKPOINTS = [50, 100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000];

// Promoções simuladas (em produção viriam do DB)
const ACTIVE_PROMOTIONS: Array<{
  techniqueCode: string;
  techniqueName: string;
  discount: number;
  endDate: Date;
  message: string;
}> = [
  {
    techniqueCode: 'SILK',
    techniqueName: 'Serigrafia',
    discount: 15,
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dias
    message: 'Promoção de Janeiro!'
  },
  {
    techniqueCode: 'SUBLIM',
    techniqueName: 'Sublimação',
    discount: 10,
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 dias
    message: 'Oferta especial!'
  },
];

// Dados simulados de "clientes similares" (em produção, ML + histórico)
const SIMILAR_CLIENTS_DATA: Record<string, {
  commonQuantities: number[];
  preferredTechniques: string[];
  avgOrderValue: number;
  tip: string;
}> = {
  'tecnologia': {
    commonQuantities: [100, 250, 500],
    preferredTechniques: ['LASER', 'DTF', 'SILK'],
    avgOrderValue: 8500,
    tip: 'Empresas de tecnologia preferem gravação laser para canetas e DTF para camisetas de eventos.'
  },
  'saude': {
    commonQuantities: [200, 500, 1000],
    preferredTechniques: ['SILK', 'BORDADO'],
    avgOrderValue: 12000,
    tip: 'Clínicas e hospitais costumam pedir uniformes com bordado para durabilidade.'
  },
  'educacao': {
    commonQuantities: [150, 300, 500],
    preferredTechniques: ['SILK', 'TRANSFER'],
    avgOrderValue: 6000,
    tip: 'Escolas preferem serigrafia para grandes volumes de uniformes.'
  },
  'varejo': {
    commonQuantities: [100, 200, 500],
    preferredTechniques: ['DTF', 'SUBLIM'],
    avgOrderValue: 5000,
    tip: 'Lojas pedem produtos com cores vibrantes - DTF e sublimação são ideais.'
  },
  'default': {
    commonQuantities: [100, 250, 500],
    preferredTechniques: ['SILK', 'DTF'],
    avgOrderValue: 7500,
    tip: 'Serigrafia continua sendo a técnica mais versátil para a maioria dos projetos.'
  }
};

// Tipos de cenário
interface QuantityScenario {
  type: 'quantity';
  quantity: number;
  additionalUnits: number;
  newCostPerUnit: number;
  currentCostPerUnit: number;
  savingsPercent: number;
  savingsPerUnit: number;
  totalSavings: number;
  roi: number; // ROI = (economia / investimento adicional) * 100
  reason: string;
  investmentRequired: number;
}

interface AlternativeTechniqueScenario {
  type: 'technique';
  technique: Technique;
  currentTechnique: string;
  newCostPerUnit: number;
  currentCostPerUnit: number;
  savingsPercent: number;
  savingsPerUnit: number;
  totalSavings: number;
  tradeoffs: string[];
  estimatedDays: number;
}

interface PromotionScenario {
  type: 'promotion';
  techniqueCode: string;
  techniqueName: string;
  discount: number;
  endDate: Date;
  daysRemaining: number;
  message: string;
  potentialSavings: number;
}

interface SimilarClientsScenario {
  type: 'similar_clients';
  ramo: string;
  suggestedQuantity: number;
  preferredTechniques: string[];
  avgOrderValue: number;
  tip: string;
  confidence: number; // 0-100
}

type Scenario = QuantityScenario | AlternativeTechniqueScenario | PromotionScenario | SimilarClientsScenario;

export function UpsellPlusPlus({
  currentQuantity,
  productPrice,
  bestOption,
  allOptions,
  techniques,
  selectedTechniques,
  onQuantityChange,
  onTechniqueChange,
  clientRamo,
  clientNicho,
}: UpsellPlusPlusProps) {
  const [activeTab, setActiveTab] = useState('all');

  // ========================
  // 1. CENÁRIOS DE QUANTIDADE COM ROI
  // ========================
  const quantityScenarios = useMemo<QuantityScenario[]>(() => {
    if (!bestOption || selectedTechniques.length === 0 || !techniques) {
      return [];
    }

    const results: QuantityScenario[] = [];
    const relevantBreakpoints = QUANTITY_BREAKPOINTS.filter(
      bp => bp > currentQuantity && bp <= currentQuantity * 3
    );

    // Adicionar mínimo da técnica
    const selectedTechData = techniques.filter(t => selectedTechniques.includes(t.id));
    const maxMinQty = Math.max(...selectedTechData.map(t => t.min_quantity ?? 0), 0);

    if (maxMinQty > currentQuantity) {
      relevantBreakpoints.unshift(maxMinQty);
    }

    relevantBreakpoints.slice(0, 5).forEach(targetQty => {
      const setupCost = bestOption.setupCost;
      const unitPersonalizationCost = bestOption.unitCost;
      
      // Custos atuais
      const currentTotalCost = bestOption.grandTotal;
      
      // Custos novos
      const newTotalProductCost = productPrice * targetQty;
      const newTotalPersonalizationCost = (unitPersonalizationCost * targetQty) + setupCost;
      const newGrandTotal = newTotalProductCost + newTotalPersonalizationCost;
      const newCostPerUnit = newGrandTotal / targetQty;

      const currentCostPerUnit = bestOption.grandTotalPerUnit;
      const savingsPerUnit = currentCostPerUnit - newCostPerUnit;
      const savingsPercent = (savingsPerUnit / currentCostPerUnit) * 100;
      
      // Investimento adicional necessário
      const additionalUnits = targetQty - currentQuantity;
      const investmentRequired = newGrandTotal - currentTotalCost;
      
      // ROI = economia total / investimento adicional * 100
      const totalSavingsOnNewQty = savingsPerUnit * targetQty;
      const roi = investmentRequired > 0 ? (totalSavingsOnNewQty / investmentRequired) * 100 : 0;

      if (savingsPercent >= 1.5) {
        let reason = "";
        if (targetQty === maxMinQty) {
          reason = "Quantidade mínima da técnica";
        } else if (roi >= 50) {
          reason = "Alto retorno sobre investimento";
        } else if (savingsPercent >= 10) {
          reason = "Economia significativa";
        } else if (savingsPercent >= 5) {
          reason = "Diluição do setup";
        } else {
          reason = "Melhor custo-benefício";
        }

        results.push({
          type: 'quantity',
          quantity: targetQty,
          additionalUnits,
          newCostPerUnit,
          currentCostPerUnit,
          savingsPercent,
          savingsPerUnit,
          totalSavings: totalSavingsOnNewQty,
          roi,
          reason,
          investmentRequired,
        });
      }
    });

    return results.sort((a, b) => b.roi - a.roi);
  }, [currentQuantity, productPrice, bestOption, techniques, selectedTechniques]);

  // ========================
  // 2. TÉCNICAS ALTERNATIVAS MAIS BARATAS
  // ========================
  const alternativeTechniques = useMemo<AlternativeTechniqueScenario[]>(() => {
    if (!bestOption || !techniques || allOptions.length === 0) {
      return [];
    }

    const alternatives: AlternativeTechniqueScenario[] = [];
    
    // Encontrar opções mais baratas
    const cheaperOptions = allOptions
      .filter(opt => opt.techniqueId !== bestOption.techniqueId)
      .filter(opt => opt.grandTotalPerUnit < bestOption.grandTotalPerUnit)
      .sort((a, b) => a.grandTotalPerUnit - b.grandTotalPerUnit);

    cheaperOptions.slice(0, 3).forEach(option => {
      const technique = techniques.find(t => t.id === option.techniqueId);
      if (!technique) return;

      const savingsPerUnit = bestOption.grandTotalPerUnit - option.grandTotalPerUnit;
      const savingsPercent = (savingsPerUnit / bestOption.grandTotalPerUnit) * 100;
      const totalSavings = savingsPerUnit * currentQuantity;

      // Determinar tradeoffs
      const tradeoffs: string[] = [];
      
      if (option.estimatedDays > bestOption.estimatedDays) {
        tradeoffs.push(`+${option.estimatedDays - bestOption.estimatedDays} dias no prazo`);
      }
      
      const currentTech = techniques.find(t => t.id === bestOption.techniqueId);
      if (currentTech && technique) {
        // Comparar qualidade percebida (simplificado)
        const premiumTechniques = ['BORDADO', 'LASER', 'HOT_STAMP'];
        if (premiumTechniques.includes(currentTech.code || '') && !premiumTechniques.includes(technique.code || '')) {
          tradeoffs.push('Acabamento mais simples');
        }
      }

      if (tradeoffs.length === 0) {
        tradeoffs.push('Sem tradeoffs significativos!');
      }

      alternatives.push({
        type: 'technique',
        technique,
        currentTechnique: bestOption.techniqueName,
        newCostPerUnit: option.grandTotalPerUnit,
        currentCostPerUnit: bestOption.grandTotalPerUnit,
        savingsPercent,
        savingsPerUnit,
        totalSavings,
        tradeoffs,
        estimatedDays: option.estimatedDays,
      });
    });

    return alternatives;
  }, [bestOption, techniques, allOptions, currentQuantity]);

  // ========================
  // 3. PROMOÇÕES ATIVAS
  // ========================
  const activePromotions = useMemo<PromotionScenario[]>(() => {
    if (!bestOption) return [];

    const now = new Date();
    
    return ACTIVE_PROMOTIONS
      .filter(promo => promo.endDate > now)
      .map(promo => {
        const daysRemaining = Math.ceil((promo.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const potentialSavings = (bestOption.totalPersonalizationCost * promo.discount) / 100;
        
        return {
          type: 'promotion' as const,
          ...promo,
          daysRemaining,
          potentialSavings,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [bestOption]);

  // ========================
  // 4. CLIENTES SIMILARES (ML SIMULADO)
  // ========================
  const similarClientsInsight = useMemo<SimilarClientsScenario | null>(() => {
    const ramo = clientRamo?.toLowerCase() || '';
    const nicho = clientNicho?.toLowerCase() || '';
    
    // Encontrar dados de clientes similares
    let matchedData = SIMILAR_CLIENTS_DATA['default'];
    let matchedRamo = 'geral';
    let confidence = 60;

    if (ramo.includes('tecnologia') || ramo.includes('tech') || ramo.includes('software')) {
      matchedData = SIMILAR_CLIENTS_DATA['tecnologia'];
      matchedRamo = 'tecnologia';
      confidence = 85;
    } else if (ramo.includes('saúde') || ramo.includes('saude') || ramo.includes('hospital') || ramo.includes('clínica')) {
      matchedData = SIMILAR_CLIENTS_DATA['saude'];
      matchedRamo = 'saúde';
      confidence = 80;
    } else if (ramo.includes('educação') || ramo.includes('educacao') || ramo.includes('escola') || ramo.includes('universidade')) {
      matchedData = SIMILAR_CLIENTS_DATA['educacao'];
      matchedRamo = 'educação';
      confidence = 82;
    } else if (ramo.includes('varejo') || ramo.includes('loja') || ramo.includes('comércio')) {
      matchedData = SIMILAR_CLIENTS_DATA['varejo'];
      matchedRamo = 'varejo';
      confidence = 78;
    }

    // Sugerir quantidade baseada no mais próximo que seja maior que atual
    const suggestedQuantity = matchedData.commonQuantities.find(q => q >= currentQuantity) 
      || matchedData.commonQuantities[matchedData.commonQuantities.length - 1];

    return {
      type: 'similar_clients',
      ramo: matchedRamo,
      suggestedQuantity,
      preferredTechniques: matchedData.preferredTechniques,
      avgOrderValue: matchedData.avgOrderValue,
      tip: matchedData.tip,
      confidence,
    };
  }, [clientRamo, clientNicho, currentQuantity]);

  // ========================
  // CONTADORES
  // ========================
  const counts = {
    quantity: quantityScenarios.length,
    techniques: alternativeTechniques.length,
    promotions: activePromotions.length,
    similar: similarClientsInsight ? 1 : 0,
    total: quantityScenarios.length + alternativeTechniques.length + activePromotions.length + (similarClientsInsight ? 1 : 0),
  };

  if (counts.total === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-3"
      >
        <Card className="overflow-hidden border-warning/30 bg-gradient-to-br from-warning/5 via-background to-orange/5">
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-warning/20 to-orange/20">
                  <Sparkles className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    Sugestões Inteligentes
                    <Badge variant="secondary" className="text-xs">
                      {counts.total} oportunidades
                    </Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Otimize seu pedido com insights baseados em dados
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs de categorias */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="all" className="text-xs gap-1">
                <Target className="h-3 w-3" />
                Todas
              </TabsTrigger>
              <TabsTrigger value="quantity" className="text-xs gap-1" disabled={counts.quantity === 0}>
                <Calculator className="h-3 w-3" />
                ROI ({counts.quantity})
              </TabsTrigger>
              <TabsTrigger value="techniques" className="text-xs gap-1" disabled={counts.techniques === 0}>
                <Zap className="h-3 w-3" />
                Alt. ({counts.techniques})
              </TabsTrigger>
              <TabsTrigger value="promotions" className="text-xs gap-1" disabled={counts.promotions === 0}>
                <Tag className="h-3 w-3" />
                Promo ({counts.promotions})
              </TabsTrigger>
              <TabsTrigger value="similar" className="text-xs gap-1" disabled={!similarClientsInsight}>
                <Users className="h-3 w-3" />
                ML
              </TabsTrigger>
            </TabsList>

            {/* Todas as sugestões */}
            <TabsContent value="all" className="space-y-3 mt-0">
              {/* Top ROI Scenario */}
              {quantityScenarios[0] && (
                <QuantityScenarioCard 
                  scenario={quantityScenarios[0]} 
                  onApply={() => onQuantityChange(quantityScenarios[0].quantity)}
                  isTop
                />
              )}

              {/* Técnica alternativa mais barata */}
              {alternativeTechniques[0] && (
                <AlternativeTechniqueCard
                  scenario={alternativeTechniques[0]}
                  onApply={() => onTechniqueChange(alternativeTechniques[0].technique.id)}
                />
              )}

              {/* Promoção urgente */}
              {activePromotions[0] && (
                <PromotionCard promotion={activePromotions[0]} />
              )}

              {/* Insight ML */}
              {similarClientsInsight && (
                <SimilarClientsCard 
                  insight={similarClientsInsight}
                  onApplyQuantity={() => onQuantityChange(similarClientsInsight.suggestedQuantity)}
                />
              )}
            </TabsContent>

            {/* Cenários de quantidade com ROI */}
            <TabsContent value="quantity" className="space-y-3 mt-0">
              {quantityScenarios.map((scenario, idx) => (
                <QuantityScenarioCard 
                  key={scenario.quantity}
                  scenario={scenario}
                  onApply={() => onQuantityChange(scenario.quantity)}
                  isTop={idx === 0}
                />
              ))}
            </TabsContent>

            {/* Técnicas alternativas */}
            <TabsContent value="techniques" className="space-y-3 mt-0">
              {alternativeTechniques.map((alt, idx) => (
                <AlternativeTechniqueCard
                  key={alt.technique.id}
                  scenario={alt}
                  onApply={() => onTechniqueChange(alt.technique.id)}
                />
              ))}
            </TabsContent>

            {/* Promoções */}
            <TabsContent value="promotions" className="space-y-3 mt-0">
              {activePromotions.map((promo, idx) => (
                <PromotionCard key={promo.techniqueCode} promotion={promo} />
              ))}
            </TabsContent>

            {/* Similar Clients ML */}
            <TabsContent value="similar" className="space-y-3 mt-0">
              {similarClientsInsight && (
                <SimilarClientsCard 
                  insight={similarClientsInsight}
                  onApplyQuantity={() => onQuantityChange(similarClientsInsight.suggestedQuantity)}
                  expanded
                />
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// ========================
// SUBCOMPONENTES
// ========================

function QuantityScenarioCard({ 
  scenario, 
  onApply, 
  isTop = false 
}: { 
  scenario: QuantityScenario; 
  onApply: () => void;
  isTop?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "p-3 rounded-lg border",
        isTop 
          ? "bg-gradient-to-r from-primary/10 to-primary/10 border-primary/30" 
          : "bg-card/50 border-border/50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isTop ? "default" : "secondary"} className={cn(
              "text-xs gap-1",
              isTop && "bg-primary hover:bg-primary/90"
            )}>
              <TrendingUp className="h-3 w-3" />
              ROI {scenario.roi.toFixed(0)}%
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Percent className="h-3 w-3" />
              -{scenario.savingsPercent.toFixed(1)}%/un
            </Badge>
          </div>

          <p className="text-sm mt-2">
            <span className="font-semibold">{scenario.quantity} unidades</span>
            <span className="text-muted-foreground"> (+{scenario.additionalUnits})</span>
          </p>

          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>
              <span className="line-through">{formatCurrency(scenario.currentCostPerUnit)}</span>
              {" → "}
              <span className="font-semibold text-primary">{formatCurrency(scenario.newCostPerUnit)}</span>
              /un
            </span>
            <span className="text-primary font-medium">
              Economia: {formatCurrency(scenario.totalSavings)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Calculator className="h-3 w-3" />
            Investimento adicional: {formatCurrency(scenario.investmentRequired)}
          </p>
        </div>

        <Button
          size="sm"
          variant={isTop ? "default" : "outline"}
          className={cn("shrink-0", isTop && "bg-primary hover:bg-primary/90")}
          onClick={onApply}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Aplicar
        </Button>
      </div>
    </motion.div>
  );
}

function AlternativeTechniqueCard({
  scenario,
  onApply,
}: {
  scenario: AlternativeTechniqueScenario;
  onApply: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-3 rounded-lg border bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary text-xs gap-1">
              <Zap className="h-3 w-3" />
              Técnica Alternativa
            </Badge>
            <Badge variant="outline" className="text-xs text-primary border-primary/30">
              -{scenario.savingsPercent.toFixed(1)}%
            </Badge>
          </div>

          <p className="text-sm mt-2">
            <span className="text-muted-foreground line-through">{scenario.currentTechnique}</span>
            {" → "}
            <span className="font-semibold">{scenario.technique.name}</span>
          </p>

          <div className="flex items-center gap-4 mt-1 text-xs">
            <span className="text-muted-foreground">
              <span className="line-through">{formatCurrency(scenario.currentCostPerUnit)}</span>
              {" → "}
              <span className="font-semibold text-primary">{formatCurrency(scenario.newCostPerUnit)}</span>
              /un
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {scenario.estimatedDays} dias
            </span>
          </div>

          {/* Tradeoffs */}
          <div className="flex flex-wrap gap-1 mt-2">
            {scenario.tradeoffs.map((tradeoff, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tradeoff}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-primary/30 hover:bg-primary/10"
          onClick={onApply}
        >
          <ArrowRight className="h-4 w-4 mr-1" />
          Trocar
        </Button>
      </div>
    </motion.div>
  );
}

function PromotionCard({ promotion }: { promotion: PromotionScenario }) {
  const isUrgent = promotion.daysRemaining <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "p-3 rounded-lg border",
        isUrgent 
          ? "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 animate-pulse" 
          : "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/25"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isUrgent ? "bg-red-500/20" : "bg-primary/20"
        )}>
          {isUrgent ? (
            <Flame className="h-4 w-4 text-red-500" />
          ) : (
            <Tag className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn(
              "text-xs gap-1",
              isUrgent ? "bg-red-500" : "bg-primary"
            )}>
              -{promotion.discount}% {promotion.techniqueName}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-xs gap-1",
              isUrgent && "border-red-500/30 text-red-600"
            )}>
              <Clock className="h-3 w-3" />
              {promotion.daysRemaining === 0 
                ? "Último dia!" 
                : promotion.daysRemaining === 1 
                  ? "Termina amanhã!" 
                  : `${promotion.daysRemaining} dias restantes`
              }
            </Badge>
          </div>

          <p className="text-sm mt-1">
            {promotion.message}
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            Economia potencial: <span className="font-semibold text-primary">{formatCurrency(promotion.potentialSavings)}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SimilarClientsCard({ 
  insight, 
  onApplyQuantity,
  expanded = false 
}: { 
  insight: SimilarClientsScenario;
  onApplyQuantity: () => void;
  expanded?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-3 rounded-lg border bg-gradient-to-r from-primary/15 to-primary/5 border-primary/30"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <Users className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary text-xs gap-1">
              <BarChart3 className="h-3 w-3" />
              Clientes Similares
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Sparkles className="h-3 w-3" />
                    {insight.confidence}% confiança
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Baseado em pedidos de empresas do ramo "{insight.ramo}"</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <p className="text-sm mt-2 font-medium">
            Empresas de {insight.ramo} costumam pedir {insight.suggestedQuantity} unidades
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            {insight.tip}
          </p>

          {expanded && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Técnicas preferidas:</span>
                {insight.preferredTechniques.map(tech => (
                  <Badge key={tech} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Ticket médio: <span className="font-semibold">{formatCurrency(insight.avgOrderValue)}</span>
              </p>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            className="mt-2 border-primary/30 hover:bg-primary/10"
            onClick={onApplyQuantity}
          >
            Usar {insight.suggestedQuantity} un
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
