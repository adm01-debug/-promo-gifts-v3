import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Package, Truck, AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useExternalVariantStock } from "@/hooks/useExternalVariantStock";
import { useVariantSupplierSourcesByVariantIds, type VariantSupplierSource } from "@/hooks/useVariantSupplierSources";

interface ColorVariation {
  name: string;
  hex: string;
  sku?: string;
  stock?: number;
  image?: string;
}

interface FutureStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productSku: string;
  colors: ColorVariation[];
}

// Tipo para representar uma entrada de reposição
interface StockEntry {
  id: string;
  colorName: string;
  colorHex: string;
  sku: string;
  supplierSku: string;
  thumbnail: string | null;
  expectedDate: string;
  expectedQuantity: number;
  currentStock: number;
  reservedStock: number;
  entryIndex: number; // 1, 2 ou 3
}

export function FutureStockModal({
  open,
  onOpenChange,
  productId,
  productName,
  productSku,
  colors,
}: FutureStockModalProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
  const { data: externalVariants = [], isLoading: isLoadingVariants } = useExternalVariantStock(productId);
  
  // Pegar os IDs das variantes
  const variantIds = useMemo(() => externalVariants.map(v => v.id), [externalVariants]);
  
  // Buscar dados de estoque/reposição para essas variantes
  const { data: supplierSources = [], isLoading: isLoadingSources } = useVariantSupplierSourcesByVariantIds(variantIds);
  
  const isLoading = isLoadingVariants || isLoadingSources;
  
  // Processar os dados e criar lista de entradas de reposição
  const stockEntries = useMemo(() => {
    const entries: StockEntry[] = [];
    
    supplierSources.forEach(source => {
      const variant = externalVariants.find(v => v.id === source.variant_id);
      if (!variant) return;
      
      const baseEntry = {
        colorName: variant.color_name || 'Sem cor',
        colorHex: variant.color_hex || '#CCCCCC',
        sku: variant.sku,
        supplierSku: source.supplier_sku,
        thumbnail: variant.selected_thumbnail || variant.images?.[0] || null,
        currentStock: source.quantity,
        reservedStock: source.reserved_quantity,
      };
      
      // Adicionar cada entrada de reposição
      if (source.next_quantity_1 && source.next_date_1) {
        entries.push({
          ...baseEntry,
          id: `${source.id}-1`,
          expectedDate: source.next_date_1,
          expectedQuantity: source.next_quantity_1,
          entryIndex: 1,
        });
      }
      
      if (source.next_quantity_2 && source.next_date_2) {
        entries.push({
          ...baseEntry,
          id: `${source.id}-2`,
          expectedDate: source.next_date_2,
          expectedQuantity: source.next_quantity_2,
          entryIndex: 2,
        });
      }
      
      if (source.next_quantity_3 && source.next_date_3) {
        entries.push({
          ...baseEntry,
          id: `${source.id}-3`,
          expectedDate: source.next_date_3,
          expectedQuantity: source.next_quantity_3,
          entryIndex: 3,
        });
      }
    });
    
    // Ordenar por data
    return entries.sort((a, b) => 
      new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime()
    );
  }, [supplierSources, externalVariants]);
  
  // Enriquecer cores com dados das variantes externas + dados de reposição
  const enrichedColors = useMemo(() => {
    return colors.map(color => {
      const variant = externalVariants.find(
        v => v.color_name === color.name || v.color_code === color.sku?.split('-').pop()
      );
      
      const source = variant 
        ? supplierSources.find(s => s.variant_id === variant.id)
        : null;
      
      // Calcular total incoming para essa cor
      const colorEntries = stockEntries.filter(e => e.colorName === color.name);
      const totalIncoming = colorEntries.reduce((sum, e) => sum + e.expectedQuantity, 0);
      
      return {
        ...color,
        image: variant?.selected_thumbnail || variant?.images?.[0] || color.image,
        stock: source?.quantity ?? variant?.stock_quantity ?? color.stock,
        reserved: source?.reserved_quantity ?? 0,
        incomingCount: colorEntries.length,
        incomingTotal: totalIncoming,
      };
    });
  }, [colors, externalVariants, supplierSources, stockEntries]);
  
  // Filtrar por cor se selecionada
  const filteredEntries = selectedColor
    ? stockEntries.filter(entry => entry.colorName === selectedColor)
    : stockEntries;
  
  const hasNoFutureStock = stockEntries.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span>Estoque Futuro</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                {productName} • SKU: {productSku}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[calc(85vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {/* Filtro por cor - cards clicáveis */}
            {!isLoading && enrichedColors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Filtrar por variação
                  </span>
                  {selectedColor && (
                    <button
                      onClick={() => setSelectedColor(null)}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver todas
                    </button>
                  )}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {enrichedColors.map((color) => {
                    const hasEntries = color.incomingCount > 0;
                    const isSelected = selectedColor === color.name;
                    
                    return (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(isSelected ? null : color.name)}
                        className={cn(
                          "shrink-0 rounded-xl overflow-hidden transition-all duration-200",
                          "border bg-card hover:shadow-md",
                          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                          !hasEntries && "opacity-40"
                        )}
                        style={{
                          borderColor: isSelected ? color.hex : undefined,
                        }}
                      >
                        {/* Imagem ou cor sólida */}
                        <div className="w-20 aspect-square relative overflow-hidden">
                          {color.image ? (
                            <img
                              src={color.image}
                              alt={color.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full"
                              style={{ backgroundColor: color.hex }}
                            />
                          )}
                          {/* Badge de quantidade incoming */}
                          {hasEntries && (
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                              +{color.incomingTotal.toLocaleString("pt-BR")}
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-2 text-center">
                          <span className="text-xs font-medium truncate block">
                            {color.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Atual: {(color.stock ?? 0).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Lista de reposições futuras */}
            {!isLoading && hasNoFutureStock ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  Sem previsão de reposição
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Não há reposições agendadas para este produto no fornecedor.
                </p>
              </div>
            ) : !isLoading && (
              <div className="space-y-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Previsões de reposição ({filteredEntries.length})
                </span>
                <div className="space-y-3">
                  {filteredEntries.map((entry) => {
                    const expectedDate = parseISO(entry.expectedDate);
                    const daysUntil = Math.ceil(
                      (expectedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysUntil <= 7;
                    const isPast = daysUntil < 0;
                    
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border bg-card transition-all",
                          isUrgent && !isPast && "border-warning/30 bg-warning/5",
                          isPast && "border-destructive/30 bg-destructive/5"
                        )}
                      >
                        {/* Imagem ou Cor */}
                        <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden border border-border">
                          {entry.thumbnail ? (
                            <img
                              src={entry.thumbnail}
                              alt={entry.colorName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full"
                              style={{ backgroundColor: entry.colorHex }}
                            />
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {entry.colorName}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-2 py-0",
                                isPast 
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : isUrgent
                                    ? "bg-warning/10 text-warning border-warning/20"
                                    : "bg-info/10 text-info border-info/20"
                              )}
                            >
                              {isPast ? "Atrasado" : isUrgent ? "Em breve" : `Previsão ${entry.entryIndex}`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(expectedDate, "dd 'de' MMMM", { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="h-3.5 w-3.5" />
                              SKU: {entry.supplierSku}
                            </span>
                          </div>
                        </div>
                        
                        {/* Quantidade */}
                        <div className="text-right shrink-0">
                          <span className="text-xl font-bold text-primary">
                            +{entry.expectedQuantity.toLocaleString("pt-BR")}
                          </span>
                          <p className="text-xs text-muted-foreground">unidades</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Resumo total */}
            {!isLoading && !hasNoFutureStock && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Total previsto</span>
                      <p className="text-sm text-muted-foreground">
                        {filteredEntries.length} reposição(ões) agendada(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">
                      +{filteredEntries.reduce((sum, e) => sum + e.expectedQuantity, 0).toLocaleString("pt-BR")}
                    </span>
                    <p className="text-xs text-muted-foreground">unidades no total</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
