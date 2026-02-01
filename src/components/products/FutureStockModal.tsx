import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Package, Truck, AlertTriangle, Calendar, Loader2, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  useProductVariantsWithStock,
  processStockEntries,
  calculateColorSummary,
} from "@/hooks/useVariantSupplierSources";

interface FutureStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productSku: string;
}

export function FutureStockModal({
  open,
  onOpenChange,
  productId,
  productName,
  productSku,
}: FutureStockModalProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
  // Buscar variantes com dados de estoque/reposição
  const { data: variantsWithStock = [], isLoading, error } = useProductVariantsWithStock(productId);
  
  // Processar entradas de reposição
  const stockEntries = useMemo(
    () => processStockEntries(variantsWithStock),
    [variantsWithStock]
  );
  
  // Calcular resumo por cor
  const colorSummary = useMemo(
    () => calculateColorSummary(variantsWithStock, stockEntries),
    [variantsWithStock, stockEntries]
  );
  
  // Filtrar por cor se selecionada
  const filteredEntries = selectedColor
    ? stockEntries.filter(entry => entry.colorName === selectedColor)
    : stockEntries;
  
  const hasNoFutureStock = stockEntries.length === 0;
  const hasVariants = variantsWithStock.length > 0;

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
            
            {/* Error */}
            {error && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  Erro ao carregar dados
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {error instanceof Error ? error.message : 'Erro desconhecido'}
                </p>
              </div>
            )}
            
            {/* Filtro por cor - cards clicáveis */}
            {!isLoading && !error && colorSummary.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Filtrar por variação ({colorSummary.length} cores)
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
                  {colorSummary.map((color) => {
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
                          {color.thumbnail ? (
                            <img
                              src={color.thumbnail}
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
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-0.5">
                              <TrendingUp className="h-2.5 w-2.5" />
                              {color.incomingTotal.toLocaleString("pt-BR")}
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-2 text-center">
                          <span className="text-xs font-medium truncate block">
                            {color.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Atual: {color.currentStock.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Estado vazio - sem variantes */}
            {!isLoading && !error && !hasVariants && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  Produto sem variantes
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Este produto não possui variantes de cor cadastradas no sistema.
                </p>
              </div>
            )}
            
            {/* Lista de reposições futuras */}
            {!isLoading && !error && hasVariants && hasNoFutureStock ? (
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
                <p className="text-xs text-muted-foreground/70 mt-2">
                  Dica: Previsões são fornecidas apenas pela API SPOT (Stricker).
                </p>
              </div>
            ) : !isLoading && !error && hasVariants && (
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
                    const isUrgent = daysUntil <= 7 && daysUntil >= 0;
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
                              {format(expectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="h-3.5 w-3.5" />
                              SKU: {entry.supplierSku}
                            </span>
                          </div>
                          {/* Estoque atual da variante */}
                          <div className="text-xs text-muted-foreground/70 mt-1">
                            Estoque atual: {entry.currentStock.toLocaleString("pt-BR")} un
                            {entry.reservedStock > 0 && (
                              <span className="ml-2">
                                (reservado: {entry.reservedStock.toLocaleString("pt-BR")})
                              </span>
                            )}
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
            {!isLoading && !error && !hasNoFutureStock && (
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
