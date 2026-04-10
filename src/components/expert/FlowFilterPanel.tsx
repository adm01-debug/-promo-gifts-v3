import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, DollarSign, Layers, Volume2, Tag, SlidersHorizontal, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FlowFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // Price
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (v: string) => void;
  onPriceMaxChange: (v: string) => void;
  // Category
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (c: string | null) => void;
  // Material
  materials: string[];
  selectedMaterial: string | null;
  onMaterialChange: (m: string | null) => void;
  // Audio
  autoPlayTts: boolean;
  onAutoPlayTtsChange: (v: boolean) => void;
  // Stats
  activeFiltersCount: number;
  onReset: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold px-1 pt-4 pb-1.5 select-none">
      {children}
    </div>
  );
}

export function FlowFilterPanel({
  isOpen, onClose,
  priceMin, priceMax, onPriceMinChange, onPriceMaxChange,
  categories, selectedCategory, onCategoryChange,
  materials, selectedMaterial, onMaterialChange,
  autoPlayTts, onAutoPlayTtsChange,
  activeFiltersCount, onReset,
}: FlowFilterPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 z-20 rounded-2xl"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute left-0 top-0 bottom-0 z-30 w-[280px] max-w-[85%] bg-card/95 backdrop-blur-xl border-r border-border/40 rounded-l-2xl flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Limpar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-7 w-7 p-0 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1 px-4">
              <div className="pb-6">
                {/* PREÇO */}
                <SectionLabel>
                  <DollarSign className="h-3 w-3 inline mr-1 -mt-0.5" />
                  Faixa de preço
                </SectionLabel>
                <div className="flex items-center gap-2 px-1">
                  <div className="flex-1 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 font-medium">R$</span>
                    <input
                      type="number"
                      min={0}
                      value={priceMin}
                      onChange={(e) => onPriceMinChange(e.target.value)}
                      placeholder="Mín"
                      className={cn(
                        "w-full h-8 pl-7 pr-2 rounded-lg text-xs bg-background/50 border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40",
                        priceMin ? "border-primary/40" : "border-border/40"
                      )}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/40 font-medium">—</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 font-medium">R$</span>
                    <input
                      type="number"
                      min={0}
                      value={priceMax}
                      onChange={(e) => onPriceMaxChange(e.target.value)}
                      placeholder="Máx"
                      className={cn(
                        "w-full h-8 pl-7 pr-2 rounded-lg text-xs bg-background/50 border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40",
                        priceMax ? "border-primary/40" : "border-border/40"
                      )}
                    />
                  </div>
                </div>

                {/* CATEGORIAS */}
                {categories.length > 0 && (
                  <>
                    <SectionLabel>
                      <Tag className="h-3 w-3 inline mr-1 -mt-0.5" />
                      Categoria
                    </SectionLabel>
                    <div className="flex flex-wrap gap-1.5 px-1 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-border/40">
                      {categories.slice(0, 20).map((cat) => {
                        const isSelected = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => onCategoryChange(isSelected ? null : cat)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150",
                              isSelected
                                ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                                : "bg-background/40 border-border/30 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-accent/50"
                            )}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* MATERIAIS */}
                {materials.length > 0 && (
                  <>
                    <SectionLabel>
                      <Layers className="h-3 w-3 inline mr-1 -mt-0.5" />
                      Material
                    </SectionLabel>
                    <div className="flex flex-wrap gap-1.5 px-1 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-border/40">
                      {materials.slice(0, 20).map((mat) => {
                        const isSelected = selectedMaterial === mat;
                        return (
                          <button
                            key={mat}
                            onClick={() => onMaterialChange(isSelected ? null : mat)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150 flex items-center gap-1",
                              isSelected
                                ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                                : "bg-background/40 border-border/30 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-accent/50"
                            )}
                          >
                            <Layers className="h-2.5 w-2.5 opacity-40" />
                            {mat}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ÁUDIO */}
                <SectionLabel>
                  <Volume2 className="h-3 w-3 inline mr-1 -mt-0.5" />
                  Áudio
                </SectionLabel>
                <div className="flex items-center justify-between px-1 py-1.5">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-xs text-foreground">Auto-play por voz</span>
                  </div>
                  <Switch
                    checked={autoPlayTts}
                    onCheckedChange={onAutoPlayTtsChange}
                    className="scale-[0.8] origin-right"
                  />
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border/30">
              <Button
                size="sm"
                onClick={onClose}
                className="w-full h-9 rounded-xl text-xs font-medium"
              >
                Aplicar
                {activeFiltersCount > 0 && (
                  <span className="ml-1.5 h-4 min-w-4 px-1 rounded-full bg-primary-foreground/20 text-[9px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
