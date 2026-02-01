import { useState } from "react";
import { format, parseISO, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Package, Truck, AlertTriangle, X, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ColorVariation {
  name: string;
  hex: string;
  sku?: string;
  stock?: number;
  image?: string;
}

interface FutureStockEntry {
  id: string;
  colorName: string;
  colorHex: string;
  expectedDate: string;
  expectedQuantity: number;
  source: "purchase_order" | "production" | "transfer" | "manual";
  status: "pending" | "confirmed" | "in_transit";
  supplierName?: string;
}

interface FutureStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productSku: string;
  colors: ColorVariation[];
}

// Mock de dados futuros - em produção viria do banco externo
function generateMockFutureStock(colors: ColorVariation[]): FutureStockEntry[] {
  if (!colors || colors.length === 0) return [];
  
  const entries: FutureStockEntry[] = [];
  const today = new Date();
  
  colors.forEach((color, index) => {
    // Simular entrada para algumas cores
    if (index % 2 === 0 || color.stock === 0) {
      // Primeira reposição - próximos dias
      entries.push({
        id: `${color.name}-1`,
        colorName: color.name,
        colorHex: color.hex,
        expectedDate: addDays(today, 5 + index * 2).toISOString(),
        expectedQuantity: Math.floor(Math.random() * 500) + 100,
        source: "purchase_order",
        status: color.stock === 0 ? "in_transit" : "confirmed",
        supplierName: "Fornecedor Principal",
      });
    }
    
    // Algumas cores têm múltiplas reposições agendadas
    if (index % 3 === 0) {
      entries.push({
        id: `${color.name}-2`,
        colorName: color.name,
        colorHex: color.hex,
        expectedDate: addDays(today, 15 + index * 3).toISOString(),
        expectedQuantity: Math.floor(Math.random() * 300) + 200,
        source: "production",
        status: "pending",
        supplierName: "Produção Interna",
      });
    }
  });
  
  // Ordenar por data
  return entries.sort((a, b) => 
    new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime()
  );
}

const statusLabels = {
  pending: { label: "Aguardando", class: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmado", class: "bg-info/10 text-info border-info/20" },
  in_transit: { label: "Em Trânsito", class: "bg-warning/10 text-warning border-warning/20" },
};

const sourceIcons = {
  purchase_order: Package,
  production: Package,
  transfer: Truck,
  manual: Calendar,
};

export function FutureStockModal({
  open,
  onOpenChange,
  productName,
  productSku,
  colors,
}: FutureStockModalProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  
  // Em produção, isso viria de uma query ao banco externo
  const futureStock = generateMockFutureStock(colors);
  
  // Filtrar por cor se selecionada
  const filteredEntries = selectedColor
    ? futureStock.filter(entry => entry.colorName === selectedColor)
    : futureStock;
  
  // Agrupar por cor para mostrar cards visuais
  const colorGroups = colors.reduce((acc, color) => {
    const entries = futureStock.filter(e => e.colorName === color.name);
    if (entries.length > 0) {
      acc.push({ color, entries });
    }
    return acc;
  }, [] as Array<{ color: ColorVariation; entries: FutureStockEntry[] }>);
  
  const hasNoFutureStock = futureStock.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-orange-500" />
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
            {/* Filtro por cor - cards clicáveis */}
            {colors.length > 0 && (
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
                    const hasEntries = futureStock.some(e => e.colorName === color.name);
                    const isSelected = selectedColor === color.name;
                    const totalIncoming = futureStock
                      .filter(e => e.colorName === color.name)
                      .reduce((sum, e) => sum + e.expectedQuantity, 0);
                    
                    return (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(isSelected ? null : color.name)}
                        disabled={!hasEntries}
                        className={cn(
                          "shrink-0 rounded-xl overflow-hidden transition-all duration-200",
                          "border bg-card hover:shadow-md",
                          isSelected && "ring-2 ring-orange-500 ring-offset-2 ring-offset-background",
                          !hasEntries && "opacity-40 cursor-not-allowed"
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
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                              +{totalIncoming.toLocaleString("pt-BR")}
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
            {hasNoFutureStock ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  Sem previsão de reposição
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Não há reposições agendadas para este produto no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Previsões de reposição ({filteredEntries.length})
                </span>
                <div className="space-y-3">
                  {filteredEntries.map((entry) => {
                    const StatusIcon = sourceIcons[entry.source];
                    const statusInfo = statusLabels[entry.status];
                    const expectedDate = parseISO(entry.expectedDate);
                    const isUrgent = entry.status === "in_transit";
                    
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border bg-card transition-all",
                          isUrgent && "border-orange-500/30 bg-orange-500/5"
                        )}
                      >
                        {/* Cor */}
                        <div
                          className="w-12 h-12 rounded-xl shrink-0 shadow-inner border border-white/10"
                          style={{ backgroundColor: entry.colorHex }}
                        />
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {entry.colorName}
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
                              {entry.supplierName}
                            </span>
                          </div>
                        </div>
                        
                        {/* Quantidade */}
                        <div className="text-right shrink-0">
                          <span className="text-xl font-bold text-orange-500">
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
            {!hasNoFutureStock && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Total previsto</span>
                      <p className="text-sm text-muted-foreground">
                        {filteredEntries.length} reposição(ões) agendada(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-orange-500">
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
