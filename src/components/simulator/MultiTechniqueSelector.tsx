// src/components/simulator/MultiTechniqueSelector.tsx
// Melhoria #2: Seleção múltipla para orçamento

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShoppingCart, 
  Check, 
  DollarSign, 
  Clock,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SimulationOption } from "@/types/simulation";

interface MultiTechniqueSelectorProps {
  options: SimulationOption[];
  onAddToQuote: (selectedOptions: SimulationOption[]) => void;
  disabled?: boolean;
}

export function MultiTechniqueSelector({
  options,
  onAddToQuote,
  disabled = false,
}: MultiTechniqueSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.grandTotal - b.grandTotal);
  }, [options]);

  const selectedOptions = useMemo(() => {
    return sortedOptions.filter(opt => selectedIds.includes(opt.id));
  }, [sortedOptions, selectedIds]);

  const totalCost = useMemo(() => {
    return selectedOptions.reduce((acc, opt) => acc + opt.grandTotal, 0);
  }, [selectedOptions]);

  const toggleOption = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(sortedOptions.map(o => o.id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const handleConfirm = () => {
    onAddToQuote(selectedOptions);
    setOpen(false);
    setSelectedIds([]);
  };

  if (options.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          size="sm" 
          className="gap-2"
          disabled={disabled}
        >
          <ShoppingCart className="h-4 w-4" />
          Adicionar ao Orçamento
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Selecionar Técnicas para Orçamento
          </DialogTitle>
          <DialogDescription>
            Marque as técnicas que deseja incluir no orçamento do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Selecionar Todas
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Limpar
            </Button>
          </div>
          <Badge variant="secondary" className="gap-1">
            {selectedIds.length} selecionada(s)
          </Badge>
        </div>

        <ScrollArea className="max-h-80 -mx-2 px-2">
          <div className="space-y-2">
            <AnimatePresence>
              {sortedOptions.map((option, idx) => {
                const isSelected = selectedIds.includes(option.id);
                const isBest = idx === 0;
                
                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-border hover:border-muted-foreground/30",
                      isBest && !isSelected && "border-success/30 bg-success/5"
                    )}
                    onClick={() => toggleOption(option.id)}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleOption(option.id)}
                      className="pointer-events-none"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {option.techniqueName}
                        </p>
                        {isBest && (
                          <Badge className="bg-success text-success-foreground text-[10px] gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" />
                            Melhor
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{option.colors} cor(es)</span>
                        <span>{option.width}×{option.height}cm</span>
                        <span>{option.positions} pos.</span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "font-bold text-sm",
                        isBest ? "text-success" : "text-foreground"
                      )}>
                        {formatCurrency(option.grandTotal)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(option.grandTotalPerUnit)}/un
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 rounded-lg bg-muted/50 border"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Total selecionado</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(totalCost)}
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-xs text-muted-foreground">Técnicas</p>
                <p className="font-semibold">{selectedIds.length}</p>
              </div>
            </div>
          </motion.div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Adicionar {selectedIds.length} ao Orçamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
