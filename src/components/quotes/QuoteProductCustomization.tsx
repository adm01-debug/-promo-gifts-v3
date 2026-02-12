/**
 * QuoteProductCustomization — Personalização de produto dentro do orçamento
 * 
 * Usa ProductCustomizationOptions v6 com o novo fluxo:
 * Local → Técnica → Dimensões/Cores → Preço
 */

import { useCallback, useRef } from "react";
import { ProductCustomizationOptions } from "@/components/products/ProductCustomizationOptions";
import type { QuoteItemPersonalization } from "@/hooks/useQuotes";
import type { PersonalizationItem } from "@/types/customization";

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
  const lastKeyRef = useRef<string>("");

  const handleSelectionChange = useCallback((items: PersonalizationItem[]) => {
    const personalizations: QuoteItemPersonalization[] = items
      .filter(item => item.price?.success)
      .map(item => ({
        technique_id: item.techniqueId,
        technique_name: item.techniqueName,
        colors_count: item.numberOfColors,
        positions_count: 1,
        setup_cost: item.price!.setup_total,
        unit_cost: item.price!.preco_unitario,
        total_cost: item.price!.total_cobrado,
        notes: `${item.locationName} — ${item.codigoTabela}`,
      }));

    const key = JSON.stringify(personalizations);
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
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
