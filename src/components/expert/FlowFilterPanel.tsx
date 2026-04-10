import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, DollarSign, Layers, Volume2, Tag, SlidersHorizontal, RotateCcw,
  Palette, Package, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  // Color
  colors: string[];
  selectedColor: string | null;
  onColorChange: (c: string | null) => void;
  // Stock
  onlyInStock: boolean;
  onOnlyInStockChange: (v: boolean) => void;
  // Audio
  autoPlayTts: boolean;
  onAutoPlayTtsChange: (v: boolean) => void;
  // Stats
  activeFiltersCount: number;
  onReset: () => void;
}

const PRICE_PRESETS = [
  { label: "Até R$10", min: "", max: "10" },
  { label: "R$10–50", min: "10", max: "50" },
  { label: "R$50–100", min: "50", max: "100" },
  { label: "R$100+", min: "100", max: "" },
];

function SectionHeader({
  icon: Icon,
  label,
  isOpen,
  onToggle,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string | null;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-1 pt-4 pb-2 group"
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-6 w-6 rounded-lg flex items-center justify-center transition-colors",
          isOpen ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground/60"
        )}>
          <Icon className="h-3 w-3" />
        </div>
        <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70 group-hover:text-foreground transition-colors">
          {label}
        </span>
        {badge && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-md bg-primary/10 text-primary border-primary/20">
            {badge}
          </Badge>
        )}
      </div>
      <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.15 }}>
        <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
      </motion.div>
    </button>
  );
}

export function FlowFilterPanel({
  isOpen, onClose,
  priceMin, priceMax, onPriceMinChange, onPriceMaxChange,
  categories, selectedCategory, onCategoryChange,
  materials, selectedMaterial, onMaterialChange,
  colors, selectedColor, onColorChange,
  onlyInStock, onOnlyInStockChange,
  autoPlayTts, onAutoPlayTtsChange,
  activeFiltersCount, onReset,
}: FlowFilterPanelProps) {
  const [openSections, setOpenSections] = useState({
    price: true,
    category: true,
    material: true,
    color: true,
    stock: true,
    audio: true,
  });

  const toggle = (key: keyof typeof openSections) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const hasPriceFilter = !!(priceMin || priceMax);
  const priceLabel = hasPriceFilter
    ? priceMin && priceMax ? `R$${priceMin}–${priceMax}` : priceMin ? `R$${priceMin}+` : `Até R$${priceMax}`
    : null;

  const handlePreset = (min: string, max: string) => {
    if (priceMin === min && priceMax === max) {
      onPriceMinChange("");
      onPriceMaxChange("");
    } else {
      onPriceMinChange(min);
      onPriceMaxChange(max);
    }
  };

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
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-20 rounded-2xl"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="absolute left-0 top-0 bottom-0 z-30 w-[300px] max-w-[88%] bg-card/98 backdrop-blur-xl border-r border-border/30 rounded-l-2xl flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/20">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-semibold tracking-tight">Filtros</span>
                  {activeFiltersCount > 0 && (
                    <p className="text-[10px] text-primary font-medium leading-tight">
                      {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive gap-1 rounded-lg"
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
              <div className="pb-4">

                {/* ── PREÇO ── */}
                <SectionHeader
                  icon={DollarSign}
                  label="Faixa de preço"
                  isOpen={openSections.price}
                  onToggle={() => toggle("price")}
                  badge={priceLabel}
                />
                <AnimatePresence>
                  {openSections.price && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {/* Quick presets */}
                      <div className="flex flex-wrap gap-1.5 px-1 mb-2.5">
                        {PRICE_PRESETS.map((p) => {
                          const isActive = priceMin === p.min && priceMax === p.max;
                          return (
                            <button
                              key={p.label}
                              onClick={() => handlePreset(p.min, p.max)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all duration-150",
                                isActive
                                  ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                                  : "bg-muted/20 border-border/30 text-muted-foreground/60 hover:border-primary/20 hover:text-foreground"
                              )}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Manual inputs */}
                      <div className="flex items-center gap-2 px-1">
                        <div className="flex-1 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 font-medium">R$</span>
                          <input
                            type="number"
                            min={0}
                            value={priceMin}
                            onChange={(e) => onPriceMinChange(e.target.value)}
                            placeholder="Mín"
                            className={cn(
                              "w-full h-8 pl-7 pr-2 rounded-lg text-xs bg-background/50 border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40",
                              priceMin ? "border-primary/40" : "border-border/30"
                            )}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground/30">—</span>
                        <div className="flex-1 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 font-medium">R$</span>
                          <input
                            type="number"
                            min={0}
                            value={priceMax}
                            onChange={(e) => onPriceMaxChange(e.target.value)}
                            placeholder="Máx"
                            className={cn(
                              "w-full h-8 pl-7 pr-2 rounded-lg text-xs bg-background/50 border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40",
                              priceMax ? "border-primary/40" : "border-border/30"
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Divider */}
                <div className="h-px bg-border/15 mx-1 mt-1" />

                {/* ── CATEGORIAS ── */}
                {categories.length > 0 && (
                  <>
                    <SectionHeader
                      icon={Tag}
                      label="Categoria"
                      isOpen={openSections.category}
                      onToggle={() => toggle("category")}
                      badge={selectedCategory}
                    />
                    <AnimatePresence>
                      {openSections.category && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap gap-1.5 px-1 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-border/40">
                            {categories.slice(0, 25).map((cat) => {
                              const isSelected = selectedCategory === cat;
                              return (
                                <button
                                  key={cat}
                                  onClick={() => onCategoryChange(isSelected ? null : cat)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150",
                                    isSelected
                                      ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                                      : "bg-muted/15 border-border/25 text-muted-foreground/70 hover:border-primary/25 hover:text-foreground hover:bg-accent/40"
                                  )}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="h-px bg-border/15 mx-1 mt-1" />
                  </>
                )}

                {/* ── MATERIAIS ── */}
                {materials.length > 0 && (
                  <>
                    <SectionHeader
                      icon={Layers}
                      label="Material"
                      isOpen={openSections.material}
                      onToggle={() => toggle("material")}
                      badge={selectedMaterial}
                    />
                    <AnimatePresence>
                      {openSections.material && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap gap-1.5 px-1 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-border/40">
                            {materials.slice(0, 25).map((mat) => {
                              const isSelected = selectedMaterial === mat;
                              return (
                                <button
                                  key={mat}
                                  onClick={() => onMaterialChange(isSelected ? null : mat)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150",
                                    isSelected
                                      ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                                      : "bg-muted/15 border-border/25 text-muted-foreground/70 hover:border-primary/25 hover:text-foreground hover:bg-accent/40"
                                  )}
                                >
                                  {mat}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="h-px bg-border/15 mx-1 mt-1" />
                  </>
                )}

                {/* ── CORES ── */}
                {colors.length > 0 && (
                  <>
                    <SectionHeader
                      icon={Palette}
                      label="Cor"
                      isOpen={openSections.color}
                      onToggle={() => toggle("color")}
                      badge={selectedColor}
                    />
                    <AnimatePresence>
                      {openSections.color && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap gap-1.5 px-1 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-border/40">
                            {colors.slice(0, 25).map((color) => {
                              const isSelected = selectedColor === color;
                              return (
                                <button
                                  key={color}
                                  onClick={() => onColorChange(isSelected ? null : color)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150 flex items-center gap-1.5",
                                    isSelected
                                      ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                                      : "bg-muted/15 border-border/25 text-muted-foreground/70 hover:border-primary/25 hover:text-foreground hover:bg-accent/40"
                                  )}
                                >
                                  <Palette className="h-2.5 w-2.5 opacity-50" />
                                  {color}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="h-px bg-border/15 mx-1 mt-1" />
                  </>
                )}

                {/* ── ESTOQUE ── */}
                <SectionHeader
                  icon={Package}
                  label="Disponibilidade"
                  isOpen={openSections.stock}
                  onToggle={() => toggle("stock")}
                  badge={onlyInStock ? "Ativo" : null}
                />
                <AnimatePresence>
                  {openSections.stock && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-1 py-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-muted-foreground/50" />
                          <span className="text-xs text-foreground">Apenas com estoque</span>
                        </div>
                        <Switch
                          checked={onlyInStock}
                          onCheckedChange={onOnlyInStockChange}
                          className="scale-[0.8] origin-right"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="h-px bg-border/15 mx-1 mt-1" />

                {/* ── ÁUDIO ── */}
                <SectionHeader
                  icon={Volume2}
                  label="Áudio"
                  isOpen={openSections.audio}
                  onToggle={() => toggle("audio")}
                  badge={null}
                />
                <AnimatePresence>
                  {openSections.audio && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-1 py-1">
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                          <span className="text-xs text-foreground">Auto-play por voz</span>
                        </div>
                        <Switch
                          checked={autoPlayTts}
                          onCheckedChange={onAutoPlayTtsChange}
                          className="scale-[0.8] origin-right"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border/20 bg-gradient-to-t from-card to-transparent">
              <Button
                size="sm"
                onClick={onClose}
                className="w-full h-9 rounded-xl text-xs font-medium gap-1.5"
              >
                <Sparkles className="h-3 w-3" />
                Aplicar filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-1 h-4 min-w-4 px-1 rounded-full bg-primary-foreground/20 text-[9px] font-bold flex items-center justify-center">
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
