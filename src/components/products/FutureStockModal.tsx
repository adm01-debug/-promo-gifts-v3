import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Package, Truck, AlertTriangle, Calendar, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useFutureStockByProduct, type FutureStockEntry } from "@/hooks/useFutureStock";
import { AddFutureStockDialog } from "./AddFutureStockDialog";

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

const statusLabels: Record<FutureStockEntry['status'], { label: string; class: string }> = {
  pending: { label: "Aguardando", class: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmado", class: "bg-info/10 text-info border-info/20" },
  in_transit: { label: "Em Trânsito", class: "bg-warning/10 text-warning border-warning/20" },
  partial: { label: "Parcial", class: "bg-secondary text-secondary-foreground" },
  completed: { label: "Concluído", class: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelado", class: "bg-destructive/10 text-destructive border-destructive/20" },
};

const sourceIcons: Record<FutureStockEntry['source'], typeof Package> = {
  purchase_order: Package,
  production: Package,
  transfer: Truck,
  manual: Calendar,
};

const sourceLabels: Record<FutureStockEntry['source'], string> = {
  purchase_order: "Pedido de Compra",
  production: "Produção",
  transfer: "Transferência",
  manual: "Manual",
};

export function FutureStockModal({
  open,
  onOpenChange,
  productId,
  productName,
  productSku,
  colors,
}: FutureStockModalProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  const { data: futureStock = [], isLoading } = useFutureStockByProduct(productId);
  
  // Filtrar por cor se selecionada
  const filteredEntries = selectedColor
    ? futureStock.filter(entry => entry.color_name === selectedColor)
    : futureStock;
  
  // Calcular totais por cor para exibir nos cards
  const totalsByColor = colors.reduce((acc, color) => {
    const entries = futureStock.filter(e => e.color_name === color.name);
    const total = entries.reduce((sum, e) => sum + e.expected_quantity, 0);
    acc[color.name] = { count: entries.length, total };
    return acc;
  }, {} as Record<string, { count: number; total: number }>);
  
  const hasNoFutureStock = futureStock.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
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
              <Button
                size="sm"
                onClick={() => setAddDialogOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Adicionar Previsão
              </Button>
            </div>
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
              {!isLoading && colors.length > 0 && (
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
                    {colors.map((color) => {
                      const colorData = totalsByColor[color.name] || { count: 0, total: 0 };
                      const hasEntries = colorData.count > 0;
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
                                +{colorData.total.toLocaleString("pt-BR")}
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
                  <p className="text-sm text-muted-foreground max-w-xs mb-4">
                    Não há reposições agendadas para este produto no momento.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Primeira Previsão
                  </Button>
                </div>
              ) : !isLoading && (
                <div className="space-y-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Previsões de reposição ({filteredEntries.length})
                  </span>
                  <div className="space-y-3">
                    {filteredEntries.map((entry) => {
                      const StatusIcon = sourceIcons[entry.source];
                      const statusInfo = statusLabels[entry.status];
                      const expectedDate = parseISO(entry.expected_date);
                      const isUrgent = entry.status === "in_transit";
                      
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border bg-card transition-all",
                            isUrgent && "border-warning/30 bg-warning/5"
                          )}
                        >
                          {/* Cor */}
                          <div
                            className="w-12 h-12 rounded-xl shrink-0 shadow-inner border border-white/10"
                            style={{ backgroundColor: entry.color_hex || '#CCCCCC' }}
                          />
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">
                                {entry.color_name || 'Geral'}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] px-2 py-0", statusInfo.class)}
                              >
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(expectedDate, "dd 'de' MMMM", { locale: ptBR })}
                              </span>
                              <span className="flex items-center gap-1">
                                <StatusIcon className="h-3.5 w-3.5" />
                                {entry.supplier_name || sourceLabels[entry.source]}
                              </span>
                            </div>
                          </div>
                          
                          {/* Quantidade */}
                          <div className="text-right shrink-0">
                            <span className="text-xl font-bold text-primary">
                              +{entry.expected_quantity.toLocaleString("pt-BR")}
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
                        +{filteredEntries.reduce((sum, e) => sum + e.expected_quantity, 0).toLocaleString("pt-BR")}
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
      
      {/* Dialog para adicionar nova previsão */}
      <AddFutureStockDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        productId={productId}
        productName={productName}
        productSku={productSku}
        colors={colors}
      />
    </>
  );
}
