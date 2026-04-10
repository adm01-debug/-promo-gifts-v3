import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, DollarSign, Layers, Volume2, Tag, SlidersHorizontal, RotateCcw,
  Palette, Package, Sparkles, ChevronDown, Users, Calendar, Briefcase,
  Building2, Paintbrush, Truck, Zap, Target, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────
export interface FlowFilterState {
  priceMin: string;
  priceMax: string;
  selectedCategory: string | null;
  selectedMaterial: string | null;
  selectedColor: string | null;
  selectedGender: string | null;
  selectedSupplier: string | null;
  selectedTechnique: string | null;
  selectedPublico: string | null;
  selectedDataComemorativa: string | null;
  selectedEndomarketing: string | null;
  selectedNicho: string | null;
  selectedTag: string | null;
  onlyInStock: boolean;
  onlyNew: boolean;
  onlyKit: boolean;
  onlyBestseller: boolean;
}

export const defaultFlowFilters: FlowFilterState = {
  priceMin: "",
  priceMax: "",
  selectedCategory: null,
  selectedMaterial: null,
  selectedColor: null,
  selectedGender: null,
  selectedSupplier: null,
  selectedTechnique: null,
  selectedPublico: null,
  selectedDataComemorativa: null,
  selectedEndomarketing: null,
  selectedNicho: null,
  selectedTag: null,
  onlyInStock: false,
  onlyNew: false,
  onlyKit: false,
  onlyBestseller: false,
};

export function countActiveFilters(f: FlowFilterState): number {
  let count = 0;
  if (f.priceMin || f.priceMax) count++;
  if (f.selectedCategory) count++;
  if (f.selectedMaterial) count++;
  if (f.selectedColor) count++;
  if (f.selectedGender) count++;
  if (f.selectedSupplier) count++;
  if (f.selectedTechnique) count++;
  if (f.selectedPublico) count++;
  if (f.selectedDataComemorativa) count++;
  if (f.selectedEndomarketing) count++;
  if (f.selectedNicho) count++;
  if (f.selectedTag) count++;
  if (f.onlyInStock) count++;
  if (f.onlyNew) count++;
  if (f.onlyKit) count++;
  if (f.onlyBestseller) count++;
  return count;
}

export interface FlowFilterOptions {
  categories: string[];
  materials: string[];
  colors: string[];
  suppliers: string[];
  techniques: string[];
  publicoAlvo: string[];
  datasComemorativas: string[];
  endomarketing: string[];
  nichos: string[];
  tags: string[];
}

// ─── Props ───────────────────────────────────────────────
interface FlowFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FlowFilterState;
  onFiltersChange: (f: FlowFilterState) => void;
  options: FlowFilterOptions;
  autoPlayTts: boolean;
  onAutoPlayTtsChange: (v: boolean) => void;
  activeFiltersCount: number;
  onReset: () => void;
}

// ─── Price presets ───────────────────────────────────────
const PRICE_PRESETS = [
  { label: "Até R$10", min: "", max: "10" },
  { label: "R$10–50", min: "10", max: "50" },
  { label: "R$50–100", min: "50", max: "100" },
  { label: "R$100+", min: "100", max: "" },
];

const GENDER_OPTIONS = ["Unissex", "Masculino", "Feminino", "Infantil"];

// ─── Section groups (mirrors Super Filter) ───────────────
interface SectionDef {
  id: string;
  label: string;
  icon: React.ElementType;
}

const SECTION_GROUPS: { label: string; icon: React.ElementType; sections: SectionDef[] }[] = [
  {
    label: "PRODUTO", icon: Package,
    sections: [
      { id: "cores", label: "Cores", icon: Palette },
      { id: "categorias", label: "Categorias", icon: Tag },
      { id: "estoque", label: "Estoque", icon: Package },
      { id: "preco", label: "Faixa de Preço", icon: DollarSign },
      { id: "materiais", label: "Materiais", icon: Layers },
      { id: "genero", label: "Gênero", icon: Users },
    ],
  },
  {
    label: "COMERCIAL", icon: TrendingUp,
    sections: [
      { id: "fornecedores", label: "Fornecedores", icon: Truck },
      { id: "tecnicas", label: "Técnicas de Gravação", icon: Paintbrush },
    ],
  },
  {
    label: "MARKETING", icon: Target,
    sections: [
      { id: "publico", label: "Público-Alvo", icon: Users },
      { id: "datas", label: "Datas Comemorativas", icon: Calendar },
      { id: "endomarketing", label: "Endomarketing", icon: Briefcase },
      { id: "nichos", label: "Nichos/Segmentos", icon: Building2 },
    ],
  },
  {
    label: "ATALHOS", icon: Zap,
    sections: [
      { id: "tags", label: "Tags", icon: Tag },
      { id: "rapidas", label: "Opções Rápidas", icon: Sparkles },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────
function GroupSeparator({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-4 pb-1.5">
      <div className="h-px flex-1 bg-border/20" />
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/40">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className="h-px flex-1 bg-border/20" />
    </div>
  );
}

function SectionRow({
  icon: Icon, label, isOpen, onToggle, badge,
}: {
  icon: React.ElementType; label: string; isOpen: boolean; onToggle: () => void; badge?: string | null;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between px-1 py-2 group">
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "h-6 w-6 rounded-lg flex items-center justify-center transition-colors",
          isOpen ? "bg-primary/15 text-primary" : "bg-muted/30 text-muted-foreground/50"
        )}>
          <Icon className="h-3 w-3" />
        </div>
        <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">
          {label}
        </span>
        {badge && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-md bg-primary/10 text-primary border-primary/20">
            {badge}
          </Badge>
        )}
      </div>
      <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.12 }}>
        <ChevronDown className="h-3 w-3 text-muted-foreground/30" />
      </motion.div>
    </button>
  );
}

function CollapsibleContent({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden"
        >
          <div className="pb-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChipGrid({
  items, selected, onSelect, maxItems = 20,
}: {
  items: string[]; selected: string | null; onSelect: (v: string | null) => void; maxItems?: number;
}) {
  if (items.length === 0) return <p className="text-[10px] text-muted-foreground/40 px-1 py-1">Carregando…</p>;
  return (
    <div className="flex flex-wrap gap-1.5 px-1 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-border/30">
      {items.slice(0, maxItems).map((item) => {
        const isSelected = selected === item;
        return (
          <button
            key={item}
            onClick={() => onSelect(isSelected ? null : item)}
            className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all duration-150",
              isSelected
                ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                : "bg-muted/10 border-border/20 text-muted-foreground/60 hover:border-primary/20 hover:text-foreground hover:bg-accent/30"
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export function FlowFilterPanel({
  isOpen, onClose,
  filters, onFiltersChange, options,
  autoPlayTts, onAutoPlayTtsChange,
  activeFiltersCount, onReset,
}: FlowFilterPanelProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["preco", "categorias"]));

  const toggle = (id: string) => setOpenSections(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const update = (patch: Partial<FlowFilterState>) => onFiltersChange({ ...filters, ...patch });

  const hasPriceFilter = !!(filters.priceMin || filters.priceMax);
  const priceLabel = hasPriceFilter
    ? filters.priceMin && filters.priceMax ? `R$${filters.priceMin}–${filters.priceMax}`
      : filters.priceMin ? `R$${filters.priceMin}+` : `Até R$${filters.priceMax}`
    : null;

  const handlePreset = (min: string, max: string) => {
    if (filters.priceMin === min && filters.priceMax === max) {
      update({ priceMin: "", priceMax: "" });
    } else {
      update({ priceMin: min, priceMax: max });
    }
  };

  // Section visibility
  const shouldShow = (id: string) => {
    switch (id) {
      case "cores": return options.colors.length > 0;
      case "categorias": return options.categories.length > 0;
      case "materiais": return options.materials.length > 0;
      case "fornecedores": return options.suppliers.length > 0;
      case "tecnicas": return options.techniques.length > 0;
      case "publico": return options.publicoAlvo.length > 0;
      case "datas": return options.datasComemorativas.length > 0;
      case "endomarketing": return options.endomarketing.length > 0;
      case "nichos": return options.nichos.length > 0;
      case "tags": return options.tags.length > 0;
      default: return true;
    }
  };

  // Section badge
  const getBadge = (id: string): string | null => {
    switch (id) {
      case "preco": return priceLabel;
      case "cores": return filters.selectedColor;
      case "categorias": return filters.selectedCategory;
      case "materiais": return filters.selectedMaterial;
      case "genero": return filters.selectedGender;
      case "fornecedores": return filters.selectedSupplier;
      case "tecnicas": return filters.selectedTechnique;
      case "publico": return filters.selectedPublico;
      case "datas": return filters.selectedDataComemorativa;
      case "endomarketing": return filters.selectedEndomarketing;
      case "nichos": return filters.selectedNicho;
      case "tags": return filters.selectedTag;
      case "estoque": return filters.onlyInStock ? "Ativo" : null;
      case "rapidas": return (filters.onlyNew || filters.onlyKit || filters.onlyBestseller) ? "Ativo" : null;
      default: return null;
    }
  };

  // Section content renderers
  const renderContent = (id: string) => {
    switch (id) {
      case "preco":
        return (
          <>
            <div className="flex flex-wrap gap-1.5 px-1 mb-2">
              {PRICE_PRESETS.map((p) => {
                const isActive = filters.priceMin === p.min && filters.priceMax === p.max;
                return (
                  <button
                    key={p.label}
                    onClick={() => handlePreset(p.min, p.max)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all",
                      isActive
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-muted/10 border-border/20 text-muted-foreground/50 hover:border-primary/20"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/40">R$</span>
                <input type="number" min={0} value={filters.priceMin}
                  onChange={(e) => update({ priceMin: e.target.value })}
                  placeholder="Mín"
                  className={cn("w-full h-7 pl-6 pr-2 rounded-md text-[11px] bg-background/40 border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30",
                    filters.priceMin ? "border-primary/30" : "border-border/20"
                  )}
                />
              </div>
              <span className="text-[9px] text-muted-foreground/25">—</span>
              <div className="flex-1 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/40">R$</span>
                <input type="number" min={0} value={filters.priceMax}
                  onChange={(e) => update({ priceMax: e.target.value })}
                  placeholder="Máx"
                  className={cn("w-full h-7 pl-6 pr-2 rounded-md text-[11px] bg-background/40 border transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30",
                    filters.priceMax ? "border-primary/30" : "border-border/20"
                  )}
                />
              </div>
            </div>
          </>
        );
      case "cores":
        return <ChipGrid items={options.colors} selected={filters.selectedColor} onSelect={(v) => update({ selectedColor: v })} />;
      case "categorias":
        return <ChipGrid items={options.categories} selected={filters.selectedCategory} onSelect={(v) => update({ selectedCategory: v })} maxItems={25} />;
      case "materiais":
        return <ChipGrid items={options.materials} selected={filters.selectedMaterial} onSelect={(v) => update({ selectedMaterial: v })} />;
      case "genero":
        return <ChipGrid items={GENDER_OPTIONS} selected={filters.selectedGender} onSelect={(v) => update({ selectedGender: v })} />;
      case "fornecedores":
        return <ChipGrid items={options.suppliers} selected={filters.selectedSupplier} onSelect={(v) => update({ selectedSupplier: v })} />;
      case "tecnicas":
        return <ChipGrid items={options.techniques} selected={filters.selectedTechnique} onSelect={(v) => update({ selectedTechnique: v })} />;
      case "publico":
        return <ChipGrid items={options.publicoAlvo} selected={filters.selectedPublico} onSelect={(v) => update({ selectedPublico: v })} />;
      case "datas":
        return <ChipGrid items={options.datasComemorativas} selected={filters.selectedDataComemorativa} onSelect={(v) => update({ selectedDataComemorativa: v })} />;
      case "endomarketing":
        return <ChipGrid items={options.endomarketing} selected={filters.selectedEndomarketing} onSelect={(v) => update({ selectedEndomarketing: v })} />;
      case "nichos":
        return <ChipGrid items={options.nichos} selected={filters.selectedNicho} onSelect={(v) => update({ selectedNicho: v })} />;
      case "tags":
        return <ChipGrid items={options.tags} selected={filters.selectedTag} onSelect={(v) => update({ selectedTag: v })} />;
      case "estoque":
        return (
          <div className="flex items-center justify-between px-1 py-0.5">
            <span className="text-[11px] text-foreground/70">Apenas com estoque</span>
            <Switch checked={filters.onlyInStock} onCheckedChange={(v) => update({ onlyInStock: v })} className="scale-[0.75] origin-right" />
          </div>
        );
      case "rapidas":
        return (
          <div className="space-y-1 px-1">
            {([
              { key: "onlyNew" as const, label: "Novidades" },
              { key: "onlyKit" as const, label: "Kits" },
              { key: "onlyBestseller" as const, label: "Mais vendidos" },
            ]).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-0.5">
                <span className="text-[11px] text-foreground/70">{label}</span>
                <Switch checked={filters[key]} onCheckedChange={(v) => update({ [key]: v })} className="scale-[0.75] origin-right" />
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-20 rounded-2xl"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="absolute left-0 top-0 bottom-0 z-30 w-[300px] max-w-[88%] bg-card/98 backdrop-blur-xl border-r border-border/25 rounded-l-2xl flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-border/15">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-semibold tracking-tight">Filtros</span>
                  {activeFiltersCount > 0 && (
                    <p className="text-[9px] text-primary font-medium leading-tight">
                      {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={onReset}
                    className="h-6 px-2 text-[9px] text-muted-foreground hover:text-destructive gap-1 rounded-md"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Limpar
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 rounded-md">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Scrollable sections */}
            <ScrollArea className="flex-1 px-3">
              <div className="pb-3">
                {SECTION_GROUPS.map((group) => {
                  const visible = group.sections.filter(s => shouldShow(s.id));
                  if (visible.length === 0) return null;
                  return (
                    <div key={group.label}>
                      <GroupSeparator label={group.label} icon={group.icon} />
                      {visible.map((sec) => (
                        <div key={sec.id}>
                          <SectionRow
                            icon={sec.icon}
                            label={sec.label}
                            isOpen={openSections.has(sec.id)}
                            onToggle={() => toggle(sec.id)}
                            badge={getBadge(sec.id)}
                          />
                          <CollapsibleContent isOpen={openSections.has(sec.id)}>
                            {renderContent(sec.id)}
                          </CollapsibleContent>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Audio (always visible, separate from product filters) */}
                <div className="mt-3 pt-2 border-t border-border/15">
                  <div className="flex items-center justify-between px-1 py-1">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5 text-muted-foreground/40" />
                      <span className="text-[11px] text-foreground/70">Auto-play por voz</span>
                    </div>
                    <Switch checked={autoPlayTts} onCheckedChange={onAutoPlayTtsChange} className="scale-[0.75] origin-right" />
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-3 py-2.5 border-t border-border/15">
              <Button size="sm" onClick={onClose} className="w-full h-8 rounded-xl text-[11px] font-medium gap-1.5">
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
