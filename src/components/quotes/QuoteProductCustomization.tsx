/**
 * QuoteProductCustomization — Personalização de produto dentro do orçamento
 * 
 * Reutiliza a lógica do simulador: áreas agrupadas por local físico,
 * técnicas dinâmicas do BD externo, pricing via RPC.
 */

import { useCallback, useRef } from "react";
import { ProductCustomizationOptions } from "@/components/products/ProductCustomizationOptions";
import type { QuoteItemPersonalization } from "@/hooks/useQuotes";
import type { CustomizationPriceV2 } from "@/hooks/useGravacaoV2";

interface QuoteProductCustomizationProps {
  productId: string;
  quantity: number;
  existingPersonalizations?: QuoteItemPersonalization[];
  onPersonalizationsChange: (personalizations: QuoteItemPersonalization[]) => void;
}

export function QuoteProductCustomization({
  productId,
  quantity,
  onPersonalizationsChange,
}: QuoteProductCustomizationProps) {
  const lastSelectionsRef = useRef<string>("");

  const handleSelectionChange = useCallback((
    selections: Map<string, { areaId: string; price: CustomizationPriceV2 | null }>
  ) => {
    const personalizations: QuoteItemPersonalization[] = [];

    selections.forEach((sel, groupKey) => {
      if (!sel.price) return;

      const p: CustomizationPriceV2 = sel.price;
      personalizations.push({
        technique_id: sel.areaId,
        technique_name: p.technique || groupKey,
        colors_count: p.num_cores ?? 1,
        positions_count: 1,
        setup_cost: p.faturamento_minimo_gravacao ?? p.cost_setup ?? 0,
        unit_cost: p.unit_price ?? 0,
        total_cost: p.total_price ?? 0,
        notes: p.codigo_orcamento || undefined,
      });
    });

    // Only fire if actually changed to avoid infinite loops
    const key = JSON.stringify(personalizations);
    if (key !== lastSelectionsRef.current) {
      lastSelectionsRef.current = key;
      onPersonalizationsChange(personalizations);
    }
  }, [onPersonalizationsChange]);

  if (!productId) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Selecione um produto para ver as opções de personalização
      </div>
    );
  }

  return (
    <ProductCustomizationOptions
      productId={productId}
      quantity={quantity}
      onSelectionChange={handleSelectionChange}
    />
  );
}
