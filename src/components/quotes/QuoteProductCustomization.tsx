/**
 * QuoteProductCustomization — Personalização de produto dentro do orçamento
 * 
 * Usa ProductCustomizationOptions v6 com o novo fluxo:
 * Local → Técnica → Dimensões/Cores → Preço → BOTÃO ADICIONAR
 * 
 * Diferente do simulador, aqui o vendedor precisa clicar "Adicionar"
 * para confirmar a personalização no resumo do orçamento.
 */

import { useCallback, useRef, useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCustomizationOptions } from "@/components/products/ProductCustomizationOptions";
import type { QuoteItemPersonalization } from "@/hooks/useQuotes";
import type { PersonalizationItem } from "@/types/customization";
import { toast } from "sonner";

interface QuoteProductCustomizationProps {
  productId: string;
  quantity: number;
  existingPersonalizations?: QuoteItemPersonalization[];
  onPersonalizationsChange: (personalizations: QuoteItemPersonalization[]) => void;
}

export function QuoteProductCustomization({
  productId,
  quantity,
  existingPersonalizations = [],
  onPersonalizationsChange,
}: QuoteProductCustomizationProps) {
  // Buffer: personalizations being configured but not yet confirmed
  const [pendingItems, setPendingItems] = useState<PersonalizationItem[]>([]);
  // Track already-confirmed personalizations
  const [confirmedPersonalizations, setConfirmedPersonalizations] = useState<QuoteItemPersonalization[]>(existingPersonalizations);

  const handleSelectionChange = useCallback((items: PersonalizationItem[]) => {
    setPendingItems(items);
  }, []);

  const handleAddClick = useCallback(() => {
    const newPersonalizations: QuoteItemPersonalization[] = pendingItems
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

    if (newPersonalizations.length === 0) {
      toast.error("Configure uma técnica com preço antes de adicionar");
      return;
    }

    // Merge: replace by technique_id to avoid duplicates, keep others
    const merged = [...confirmedPersonalizations];
    newPersonalizations.forEach(np => {
      const existingIdx = merged.findIndex(m => m.technique_id === np.technique_id && m.notes === np.notes);
      if (existingIdx >= 0) {
        merged[existingIdx] = np;
      } else {
        merged.push(np);
      }
    });

    setConfirmedPersonalizations(merged);
    onPersonalizationsChange(merged);

    const count = newPersonalizations.length;
    toast.success(`${count} gravação(ões) adicionada(s) ao orçamento`);
  }, [pendingItems, confirmedPersonalizations, onPersonalizationsChange]);

  // Calculate pending total
  const pendingTotal = pendingItems
    .filter(item => item.price?.success)
    .reduce((sum, item) => sum + (item.price?.total_cobrado ?? 0), 0);

  const hasPendingPrices = pendingItems.some(item => item.price?.success);

  if (!productId) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Selecione um produto para ver as opções de personalização
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProductCustomizationOptions
        productId={productId}
        quantity={quantity}
        onSelectionChange={handleSelectionChange}
      />

      {/* Botão Adicionar — aparece quando há preço calculado */}
      {hasPendingPrices && (
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>
              Prévia: <strong className="text-primary">R$ {pendingTotal.toFixed(2)}</strong>
            </span>
          </div>
          <Button
            onClick={handleAddClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 px-6"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}
