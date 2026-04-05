/**
 * DecisionMatrixChart - Matriz de Decisão Visual
 * Gráfico Custo vs Prazo para decisão rápida
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label,
  Tooltip as RechartsTooltip,
} from "recharts";
import { 
  Target, 
  Trophy, 
  Zap, 
  DollarSign,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SimulationOption } from "@/types/simulation";

interface DecisionMatrixChartProps {
  options: SimulationOption[];
  bestOption: SimulationOption | null;
  fastestOption: SimulationOption | null;
  onSelectOption?: (option: SimulationOption) => void;
}

// Quadrantes da matriz
const QUADRANTS = {
  IDEAL: { label: "Ideal", color: "text-success", bg: "bg-success/10", description: "Baixo custo + Rápido" },
  ECONOMY: { label: "Econômico", color: "text-primary", bg: "bg-primary/10", description: "Baixo custo + Mais tempo" },
  EXPRESS: { label: "Express", color: "text-amber-500", bg: "bg-amber-500/10", description: "Alto custo + Rápido" },
  PREMIUM: { label: "Premium", color: "text-primary/80", bg: "bg-primary/10", description: "Alto custo + Mais tempo" },
};

export function DecisionMatrixChart({
  options,
  bestOption,
  fastestOption,
  onSelectOption,
}: DecisionMatrixChartProps) {
  // Preparar dados para o gráfico
  const { chartData, avgCost, avgDays, minCost, maxCost, minDays, maxDays } = useMemo(() => {
    if (options.length === 0) return { 
      chartData: [], 
      avgCost: 0, 
      avgDays: 0,
      minCost: 0,
      maxCost: 0,
      minDays: 0,
      maxDays: 0
    };

    const data = options.map(opt => ({
      x: opt.estimatedDays,
      y: opt.grandTotal,
      name: opt.techniqueName,
      id: opt.id,
      isBest: opt.id === bestOption?.id,
      isFastest: opt.id === fastestOption?.id,
      unitCost: opt.grandTotalPerUnit,
      option: opt,
    }));

    const costs = data.map(d => d.y);
    const days = data.map(d => d.x);
    
    return {
      chartData: data,
      avgCost: costs.reduce((a, b) => a + b, 0) / costs.length,
      avgDays: days.reduce((a, b) => a + b, 0) / days.length,
      minCost: Math.min(...costs),
      maxCost: Math.max(...costs),
      minDays: Math.min(...days),
      maxDays: Math.max(...days),
    };
  }, [options, bestOption, fastestOption]);

  // Determinar quadrante de cada opção
  const getQuadrant = (cost: number, days: number) => {
    const isLowCost = cost <= avgCost;
    const isFast = days <= avgDays;
    
    if (isLowCost && isFast) return QUADRANTS.IDEAL;
    if (isLowCost && !isFast) return QUADRANTS.ECONOMY;
    if (!isLowCost && isFast) return QUADRANTS.EXPRESS;
    return QUADRANTS.PREMIUM;
  };

  // Cores para os pontos
  const getPointColor = (data: typeof chartData[0]) => {
    if (data.isBest) return "hsl(var(--success))";
    if (data.isFastest) return "hsl(142, 76%, 36%)"; // emerald
    const quadrant = getQuadrant(data.y, data.x);
    if (quadrant === QUADRANTS.IDEAL) return "hsl(var(--success))";
    if (quadrant === QUADRANTS.ECONOMY) return "hsl(217, 91%, 60%)"; // blue
    if (quadrant === QUADRANTS.EXPRESS) return "hsl(45, 93%, 47%)"; // amber
    return "hsl(270, 50%, 60%)"; // purple
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    const data = payload[0].payload;
    const quadrant = getQuadrant(data.y, data.x);
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold">{data.name}</span>
          {data.isBest && (
            <Badge variant="default" className="text-xs gap-1 bg-success">
              <Trophy className="h-3 w-3" /> Melhor
            </Badge>
          )}
          {data.isFastest && !data.isBest && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Zap className="h-3 w-3" /> Mais Rápido
            </Badge>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{formatCurrency(data.y)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Por unidade:</span>
            <span className="font-medium">{formatCurrency(data.unitCost)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Prazo:</span>
            <span className="font-medium">{data.x} dias</span>
          </div>
        </div>
        <div className={cn("mt-2 pt-2 border-t text-xs", quadrant.color)}>
          {quadrant.label}: {quadrant.description}
        </div>
      </div>
    );
  };

  if (options.length < 2) {
    return null; // Não mostra matriz com menos de 2 opções
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Matriz de Decisão</CardTitle>
              <p className="text-sm text-muted-foreground">Custo vs Prazo</p>
            </div>
          </div>
          
          {/* Legenda dos Quadrantes */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(QUADRANTS).map(([key, q]) => (
              <Badge 
                key={key} 
                variant="outline" 
                className={cn("text-xs", q.color)}
              >
                {q.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-border/50"
              />
              
              {/* Linhas de referência para quadrantes */}
              <ReferenceLine
                x={avgDays}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              >
                <Label
                  value={`${avgDays.toFixed(0)}d`}
                  position="top"
                  className="fill-muted-foreground text-xs"
                />
              </ReferenceLine>
              <ReferenceLine
                y={avgCost}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              >
                <Label
                  value={formatCurrency(avgCost)}
                  position="right"
                  className="fill-muted-foreground text-xs"
                />
              </ReferenceLine>
              
              <XAxis 
                type="number"
                dataKey="x" 
                name="Prazo"
                domain={[Math.max(0, minDays - 1), maxDays + 1]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              >
                <Label 
                  value="Prazo (dias)" 
                  offset={-10}
                  position="insideBottom"
                  className="fill-muted-foreground"
                />
              </XAxis>
              
              <YAxis 
                type="number"
                dataKey="y" 
                name="Custo"
                domain={[minCost * 0.95, maxCost * 1.05]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => formatCurrency(value)}
              >
                <Label 
                  value="Custo Total" 
                  angle={-90}
                  position="insideLeft"
                  offset={-45}
                  className="fill-muted-foreground"
                />
              </YAxis>
              
              <Scatter
                data={chartData}
                fill="hsl(var(--primary))"
                isAnimationActive={true}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getPointColor(entry)}
                    stroke={entry.isBest || entry.isFastest ? "hsl(var(--background))" : "transparent"}
                    strokeWidth={entry.isBest || entry.isFastest ? 3 : 0}
                    cursor="pointer"
                    onClick={() => onSelectOption?.(entry.option)}
                  />
                ))}
              </Scatter>
              
              <RechartsTooltip content={<CustomTooltip />} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Quick Insights */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Trophy className="h-4 w-4 text-success" />
            <div className="text-xs">
              <span className="text-muted-foreground">Melhor custo-benefício: </span>
              <span className="font-medium">{bestOption?.techniqueName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Zap className="h-4 w-4 text-primary" />
            <div className="text-xs">
              <span className="text-muted-foreground">Mais rápido: </span>
              <span className="font-medium">{fastestOption?.techniqueName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <div className="text-xs">
              <span className="text-muted-foreground">Variação: </span>
              <span className="font-medium">{formatCurrency(maxCost - minCost)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-primary/80" />
            <div className="text-xs">
              <span className="text-muted-foreground">Prazo: </span>
              <span className="font-medium">{minDays}-{maxDays} dias</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
