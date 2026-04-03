/**
 * Kit Builder Sidebar — Painel contextual com preview, volume, peso, preço e frete
 * Extraído do KitBuilderPage para SRP
 */

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { KitMiniPreview } from '@/components/kit-builder/KitMiniPreview';
import { VolumeIndicator } from '@/components/kit-builder/VolumeIndicator';
import { FreightEstimator } from '@/components/kit-builder/FreightEstimator';
import { formatCurrency } from '@/lib/kit-builder';
import { cn } from '@/lib/utils';
import type { KitState } from '@/lib/kit-builder';

interface KitBuilderSidebarProps {
  kitState: KitState;
  kitQuantity: number;
}

export function KitBuilderSidebar({ kitState, kitQuantity }: KitBuilderSidebarProps) {
  const itemsWeight = kitState.items.reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0);
  const weightExceeded = kitState.box?.maxWeight ? itemsWeight > kitState.box.maxWeight : false;
  const weightPercent = kitState.box?.maxWeight ? (itemsWeight / kitState.box.maxWeight) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Kit Mini Preview — always visible */}
      <KitMiniPreview
        box={kitState.box}
        items={kitState.items}
        kitName={kitState.name}
      />

      {/* Volume Indicator — show when box selected */}
      {kitState.box && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <VolumeIndicator
            usedVolume={kitState.totalItemsVolume}
            totalVolume={kitState.box.internalVolume}
            usagePercent={kitState.volumeUsagePercent}
          />
        </motion.div>
      )}

      {/* Weight Indicator */}
      {kitState.box && kitState.box.maxWeight && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className={cn("transition-colors", weightExceeded && "border-destructive/50")}>
            <CardContent className="p-3 space-y-2">
              <h3 className="font-semibold text-xs flex items-center justify-between">
                <span>⚖️ Peso</span>
                <span className={cn(
                  "text-[10px] tabular-nums",
                  weightExceeded ? "text-destructive" : "text-muted-foreground"
                )}>
                  {(itemsWeight / 1000).toFixed(1)}kg / {(kitState.box.maxWeight / 1000).toFixed(1)}kg
                </span>
              </h3>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <motion.div
                  className={cn(
                    "h-1.5 rounded-full",
                    weightExceeded ? "bg-destructive" : weightPercent > 80 ? "bg-warning" : "bg-primary"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(weightPercent, 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              {weightExceeded && (
                <p className="text-[10px] text-destructive font-medium">
                  ⚠ Excede em {((itemsWeight - kitState.box.maxWeight!) / 1000).toFixed(1)}kg
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Price Preview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="font-semibold text-xs flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-primary" />
              <span>Prévia de Preços</span>
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Caixa</span>
                <span className="tabular-nums">{formatCurrency(kitState.boxPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens</span>
                <span className="tabular-nums">{formatCurrency(kitState.itemsPrice)}</span>
              </div>
              {kitState.personalizationPrice > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Personalização</span>
                  <span className="tabular-nums">{formatCurrency(kitState.personalizationPrice)}</span>
                </div>
              )}
              <div className="border-t pt-1.5 flex justify-between font-semibold">
                <span>Total/kit</span>
                <span className="text-primary tabular-nums">{formatCurrency(kitState.totalPrice)}</span>
              </div>
              {kitState.totalWeight > 0 && (
                <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                  <span>Peso estimado</span>
                  <span className="tabular-nums">
                    {kitState.totalWeight >= 1000 ? `${(kitState.totalWeight / 1000).toFixed(2)} kg` : `${kitState.totalWeight} g`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Freight — compact, only when weight exists */}
      {kitState.totalWeight > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <FreightEstimator totalWeightGrams={kitState.totalWeight} kitQuantity={kitQuantity} />
        </motion.div>
      )}
    </div>
  );
}
