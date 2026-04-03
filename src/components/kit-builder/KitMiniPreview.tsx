/**
 * Kit Mini Preview — Visual preview card do kit montado
 * Mostra thumbnails empilhadas dos itens + caixa
 * Padronizado com tokens semânticos do Design System
 */

import { Package, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { KitItem, KitBox } from '@/lib/kit-builder';

interface KitMiniPreviewProps {
  box: KitBox | null;
  items: KitItem[];
  kitName: string;
}

export function KitMiniPreview({ box, items, kitName }: KitMiniPreviewProps) {
  const allElements = [
    ...(box ? [{ id: 'box', name: box.name, imageUrl: box.imageUrl, isBox: true }] : []),
    ...items.map(i => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, isBox: false })),
  ];

  if (allElements.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border/50">
        <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground/60 min-h-[120px]">
          <Package className="h-8 w-8" />
          <span className="text-xs text-center">Seu kit aparecerá aqui</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</span>
          <span className="text-[10px] text-muted-foreground/60">{allElements.length} {allElements.length === 1 ? 'item' : 'itens'}</span>
        </div>
        
        {/* Stacked thumbnails */}
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {allElements.slice(0, 8).map((el, i) => (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
                className={cn(
                  "w-12 h-12 rounded-lg overflow-hidden border-2 flex items-center justify-center",
                  el.isBox ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/30"
                )}
                title={el.name}
              >
                {el.imageUrl ? (
                  <img src={el.imageUrl} alt={el.name} className="w-full h-full object-cover" />
                ) : (
                  el.isBox ? (
                    <Package className="h-5 w-5 text-primary/50" />
                  ) : (
                    <Gift className="h-5 w-5 text-muted-foreground/40" />
                  )
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {allElements.length > 8 && (
            <div className="w-12 h-12 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">+{allElements.length - 8}</span>
            </div>
          )}
        </div>

        {kitName && (
          <p className="text-xs font-medium text-foreground/80 truncate pt-1">{kitName}</p>
        )}
      </CardContent>
    </Card>
  );
}
