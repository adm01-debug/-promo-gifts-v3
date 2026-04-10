import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, DollarSign, Layers, Volume2, Tag, SlidersHorizontal, RotateCcw,
  Palette, Package, Sparkles, ChevronDown, Users, Calendar, Briefcase,
  Building2, Paintbrush, Truck, Zap, Target, TrendingUp, Search,
  CheckCircle2, Gem, Filter,
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
  selectedCategories: string[];
  selectedMaterials: string[];
  selectedColors: string[];
  selectedGenders: string[];
  selectedSuppliers: string[];
  selectedTechniques: string[];
  selectedPublicos: string[];
  selectedDatasComemorativas: string[];
  selectedEndomarketing: string[];
  selectedNichos: string[];
  selectedTags: string[];
  onlyInStock: boolean;
  onlyNew: boolean;
  onlyKit: boolean;
  onlyBestseller: boolean;
  onlyFeatured: boolean;
  hasPersonalization: boolean;
}

export const defaultFlowFilters: FlowFilterState = {
  priceMin: "",
  priceMax: "",
  selectedCategories: [],
  selectedMaterials: [],
  selectedColors: [],
  selectedGenders: [],
  selectedSuppliers: [],
  selectedTechniques: [],
  selectedPublicos: [],
  selectedDatasComemorativas: [],
  selectedEndomarketing: [],
  selectedNichos: [],
  selectedTags: [],
  onlyInStock: false,
  onlyNew: false,
  onlyKit: false,
  onlyBestseller: false,
  onlyFeatured: false,
  hasPersonalization: false,
};

export function countActiveFilters(f: FlowFilterState): number {
  let count = 0;
  if (f.priceMin || f.priceMax) count++;
  count += f.selectedCategories.length;
  count += f.selectedMaterials.length;
  count += f.selectedColors.length;
  count += f.selectedGenders.length;
  count += f.selectedSuppliers.length;
  count += f.selectedTechniques.length;
  count += f.selectedPublicos.length;
  count += f.selectedDatasComemorativas.length;
  count += f.selectedEndomarketing.length;
  count += f.selectedNichos.length;
  count += f.selectedTags.length;
  if (f.onlyInStock) count++;
  if (f.onlyNew) count++;
  if (f.onlyKit) count++;
  if (f.onlyBestseller) count++;
  if (f.onlyFeatured) count++;
  if (f.hasPersonalization) count++;
  return count;
}

/** Get a flat summary of all active filter labels */
export function getActiveFilterLabels(f: FlowFilterState): { label: string; key: string; value?: string }[] {
  const labels: { label: string; key: string; value?: string }[] = [];
  if (f.priceMin || f.priceMax) {
    const l = f.priceMin && f.priceMax ? `R$${f.priceMin}–${f.priceMax}` : f.priceMin ? `R$${f.priceMin}+` : `Até R$${f.priceMax}`;
    labels.push({ label: l, key: "price" });
  }
  f.selectedCategories.forEach(v => labels.push({ label: v, key: "selectedCategories", value: v }));
  f.selectedColors.forEach(v => labels.push({ label: v, key: "selectedColors", value: v }));
  f.selectedMaterials.forEach(v => labels.push({ label: v, key: "selectedMaterials", value: v }));
  f.selectedGenders.forEach(v => labels.push({ label: v, key: "selectedGenders", value: v }));
  f.selectedSuppliers.forEach(v => labels.push({ label: v, key: "selectedSuppliers", value: v }));
  f.selectedTechniques.forEach(v => labels.push({ label: v, key: "selectedTechniques", value: v }));
  f.selectedPublicos.forEach(v => labels.push({ label: v, key: "selectedPublicos", value: v }));
  f.selectedDatasComemorativas.forEach(v => labels.push({ label: v, key: "selectedDatasComemorativas", value: v }));
  f.selectedEndomarketing.forEach(v => labels.push({ label: v, key: "selectedEndomarketing", value: v }));
  f.selectedNichos.forEach(v => labels.push({ label: v, key: "selectedNichos", value: v }));
  f.selectedTags.forEach(v => labels.push({ label: v, key: "selectedTags", value: v }));
  if (f.onlyInStock) labels.push({ label: "Em estoque", key: "onlyInStock" });
  if (f.onlyNew) labels.push({ label: "Novidades", key: "onlyNew" });
  if (f.onlyKit) labels.push({ label: "Kits", key: "onlyKit" });
  if (f.onlyBestseller) labels.push({ label: "+ Vendidos", key: "onlyBestseller" });
  if (f.onlyFeatured) labels.push({ label: "Destaques", key: "onlyFeatured" });
  if (f.hasPersonalization) labels.push({ label: "Personalização", key: "hasPersonalization" });
  return labels;
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

// ─── Section groups ─────────────────────────────────────
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
      { id: "categorias", label: "Categorias", icon: Layers },
      { id: "materiais", label: "Materiais", icon: Gem },
      { id: "genero", label: "Gênero", icon: Users },
      { id: "preco", label: "Faixa de Preço", icon: DollarSign },
      { id: "estoque", label: "Estoque & Status", icon: Package },
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
    <div className="flex items-center gap-2 px-1 pt-5 pb-1.5">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold text-muted-foreground/35 select-none">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
    </div>
  );
}

function SectionRow({
  icon: Icon, label, isOpen, onToggle, count, totalOptions,
}: {
  icon: React.ElementType; label: string; isOpen: boolean; onToggle: () => void;
  count?: number; totalOptions?: number;
}) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between px-1 py-2 group/sec">
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "h-6 w-6 rounded-lg flex items-center justify-center transition-all duration-200",
          isOpen
            ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
            : count && count > 0
              ? "bg-primary/10 text-primary"
              : "bg-muted/20 text-muted-foreground/40 group-hover/sec:bg-muted/40"
        )}>
          <Icon className="h-3 w-3" />
        </div>
        <span className={cn(
          "text-xs font-medium transition-colors",
          count && count > 0 ? "text-foreground" : "text-foreground/70 group-hover/sec:text-foreground"
        )}>
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-md bg-primary/10 text-primary border-primary/20 font-bold">
            {count}
          </Badge>
        )}
        {totalOptions !== undefined && totalOptions > 0 && count === 0 && (
          <span className="text-[9px] text-muted-foreground/30 font-medium">{totalOptions}</span>
        )}
      </div>
      <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.15 }}>
        <ChevronDown className={cn(
          "h-3 w-3 transition-colors",
          isOpen ? "text-primary/50" : "text-muted-foreground/25"
        )} />
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
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="pb-2 pl-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Multi-select chip grid with search */
function MultiChipGrid({
  items, selected, onToggle, maxVisible = 24, searchable = false, placeholder = "Buscar…",
}: {
  items: string[]; selected: string[]; onToggle: (v: string) => void;
  maxVisible?: number; searchable?: boolean; placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.toLowerCase().includes(q));
  }, [items, search]);

  const visible = showAll ? filtered : filtered.slice(0, maxVisible);
  const hasMore = filtered.length > maxVisible && !showAll;

  if (items.length === 0) {
    return <p className="text-[10px] text-muted-foreground/30 px-1 py-1 italic">Nenhuma opção disponível</p>;
  }

  return (
    <div className="space-y-1.5">
      {searchable && items.length > 8 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full h-6 pl-7 pr-2 rounded-md text-[10px] bg-background/30 border border-border/15 placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-border/20 pr-0.5">
        {visible.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all duration-150 flex items-center gap-1",
                isSelected
                  ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/5"
                  : "bg-muted/5 border-border/15 text-muted-foreground/55 hover:border-primary/20 hover:text-foreground hover:bg-accent/20"
              )}
            >
              {isSelected && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}
              <span className="truncate max-w-[120px]">{item}</span>
            </button>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[9px] text-primary/60 hover:text-primary font-medium px-1 transition-colors"
        >
          +{filtered.length - maxVisible} mais…
        </button>
      )}
      {search && filtered.length === 0 && (
        <p className="text-[9px] text-muted-foreground/30 px-1 italic">Nenhum resultado</p>
      )}
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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["preco"]));
  const [globalSearch, setGlobalSearch] = useState("");

  const toggle = (id: string) => setOpenSections(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const update = (patch: Partial<FlowFilterState>) => onFiltersChange({ ...filters, ...patch });

  const toggleArray = (key: keyof FlowFilterState, value: string) => {
    const arr = filters[key] as string[];
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    update({ [key]: next });
  };

  const hasPriceFilter = !!(filters.priceMin || filters.priceMax);

  const handlePreset = (min: string, max: string) => {
    if (filters.priceMin === min && filters.priceMax === max) {
      update({ priceMin: "", priceMax: "" });
    } else {
      update({ priceMin: min, priceMax: max });
    }
  };

  // Section visibility
  const shouldShow = (id: string) => {
    const q = globalSearch.toLowerCase();
    const sectionMatch = (sId: string, label: string) =>
      !q || label.toLowerCase().includes(q) || sId.includes(q);

    switch (id) {
      case "cores": return options.colors.length > 0 && sectionMatch(id, "Cores");
      case "categorias": return options.categories.length > 0 && sectionMatch(id, "Categorias");
      case "materiais": return options.materials.length > 0 && sectionMatch(id, "Materiais");
      case "fornecedores": return options.suppliers.length > 0 && sectionMatch(id, "Fornecedores");
      case "tecnicas": return options.techniques.length > 0 && sectionMatch(id, "Técnicas");
      case "publico": return options.publicoAlvo.length > 0 && sectionMatch(id, "Público");
      case "datas": return options.datasComemorativas.length > 0 && sectionMatch(id, "Datas");
      case "endomarketing": return options.endomarketing.length > 0 && sectionMatch(id, "Endomarketing");
      case "nichos": return options.nichos.length > 0 && sectionMatch(id, "Nichos");
      case "tags": return options.tags.length > 0 && sectionMatch(id, "Tags");
      default: return sectionMatch(id, id);
    }
  };

  // Section active count
  const getCount = (id: string): number => {
    switch (id) {
      case "preco": return hasPriceFilter ? 1 : 0;
      case "cores": return filters.selectedColors.length;
      case "categorias": return filters.selectedCategories.length;
      case "materiais": return filters.selectedMaterials.length;
      case "genero": return filters.selectedGenders.length;
      case "fornecedores": return filters.selectedSuppliers.length;
      case "tecnicas": return filters.selectedTechniques.length;
      case "publico": return filters.selectedPublicos.length;
      case "datas": return filters.selectedDatasComemorativas.length;
      case "endomarketing": return filters.selectedEndomarketing.length;
      case "nichos": return filters.selectedNichos.length;
      case "tags": return filters.selectedTags.length;
      case "estoque": return [filters.onlyInStock].filter(Boolean).length;
      case "rapidas": return [filters.onlyNew, filters.onlyKit, filters.onlyBestseller, filters.onlyFeatured, filters.hasPersonalization].filter(Boolean).length;
      default: return 0;
    }
  };

  const getTotalOptions = (id: string): number => {
    switch (id) {
      case "cores": return options.colors.length;
      case "categorias": return options.categories.length;
      case "materiais": return options.materials.length;
      case "genero": return GENDER_OPTIONS.length;
      case "fornecedores": return options.suppliers.length;
      case "tecnicas": return options.techniques.length;
      case "publico": return options.publicoAlvo.length;
      case "datas": return options.datasComemorativas.length;
      case "endomarketing": return options.endomarketing.length;
      case "nichos": return options.nichos.length;
      case "tags": return options.tags.length;
      case "estoque": return 1;
      case "rapidas": return 5;
      case "preco": return PRICE_PRESETS.length;
      default: return 0;
    }
  };

  // Section content renderers
  const renderContent = (id: string) => {
    switch (id) {
      case "preco":
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map((p) => {
                const isActive = filters.priceMin === p.min && filters.priceMax === p.max;
                return (
                  <button
                    key={p.label}
                    onClick={() => handlePreset(p.min, p.max)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all duration-150",
                      isActive
                        ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/5"
                        : "bg-muted/5 border-border/15 text-muted-foreground/45 hover:border-primary/20 hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/35 font-medium">R$</span>
                <input type="number" min={0} step="0.01" value={filters.priceMin}
                  onChange={(e) => { const v = e.target.value; if (v === "" || Number(v) >= 0) update({ priceMin: v }); }}
                  placeholder="Mín"
                  className={cn("w-full h-7 pl-6 pr-2 rounded-lg text-[11px] bg-background/30 border transition-all focus:outline-none focus:ring-1 focus:ring-primary/25",
                    filters.priceMin ? "border-primary/30 text-primary font-medium" : "border-border/15 text-foreground/70"
                  )}
                />
              </div>
              <div className="h-px w-3 bg-border/25" />
              <div className="flex-1 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/35 font-medium">R$</span>
                <input type="number" min={0} step="0.01" value={filters.priceMax}
                  onChange={(e) => { const v = e.target.value; if (v === "" || Number(v) >= 0) update({ priceMax: v }); }}
                  placeholder="Máx"
                  className={cn("w-full h-7 pl-6 pr-2 rounded-lg text-[11px] bg-background/30 border transition-all focus:outline-none focus:ring-1 focus:ring-primary/25",
                    filters.priceMax ? "border-primary/30 text-primary font-medium" : "border-border/15 text-foreground/70"
                  )}
                />
              </div>
            </div>
          </div>
        );
      case "cores":
        return (
          <MultiChipGrid
            items={options.colors}
            selected={filters.selectedColors}
            onToggle={(v) => toggleArray("selectedColors", v)}
            searchable
            placeholder="Buscar cor…"
          />
        );
      case "categorias":
        return (
          <MultiChipGrid
            items={options.categories}
            selected={filters.selectedCategories}
            onToggle={(v) => toggleArray("selectedCategories", v)}
            searchable
            placeholder="Buscar categoria…"
            maxVisible={20}
          />
        );
      case "materiais":
        return (
          <MultiChipGrid
            items={options.materials}
            selected={filters.selectedMaterials}
            onToggle={(v) => toggleArray("selectedMaterials", v)}
            searchable
            placeholder="Buscar material…"
          />
        );
      case "genero":
        return (
          <MultiChipGrid
            items={GENDER_OPTIONS}
            selected={filters.selectedGenders}
            onToggle={(v) => toggleArray("selectedGenders", v)}
          />
        );
      case "fornecedores":
        return (
          <MultiChipGrid
            items={options.suppliers}
            selected={filters.selectedSuppliers}
            onToggle={(v) => toggleArray("selectedSuppliers", v)}
            searchable
            placeholder="Buscar fornecedor…"
          />
        );
      case "tecnicas":
        return (
          <MultiChipGrid
            items={options.techniques}
            selected={filters.selectedTechniques}
            onToggle={(v) => toggleArray("selectedTechniques", v)}
            searchable
            placeholder="Buscar técnica…"
          />
        );
      case "publico":
        return (
          <MultiChipGrid
            items={options.publicoAlvo}
            selected={filters.selectedPublicos}
            onToggle={(v) => toggleArray("selectedPublicos", v)}
            searchable
            placeholder="Buscar público…"
          />
        );
      case "datas":
        return (
          <MultiChipGrid
            items={options.datasComemorativas}
            selected={filters.selectedDatasComemorativas}
            onToggle={(v) => toggleArray("selectedDatasComemorativas", v)}
            searchable
            placeholder="Buscar data…"
          />
        );
      case "endomarketing":
        return (
          <MultiChipGrid
            items={options.endomarketing}
            selected={filters.selectedEndomarketing}
            onToggle={(v) => toggleArray("selectedEndomarketing", v)}
          />
        );
      case "nichos":
        return (
          <MultiChipGrid
            items={options.nichos}
            selected={filters.selectedNichos}
            onToggle={(v) => toggleArray("selectedNichos", v)}
            searchable
            placeholder="Buscar nicho…"
          />
        );
      case "tags":
        return (
          <MultiChipGrid
            items={options.tags}
            selected={filters.selectedTags}
            onToggle={(v) => toggleArray("selectedTags", v)}
            searchable
            placeholder="Buscar tag…"
          />
        );
      case "estoque":
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-foreground/70">Apenas com estoque</span>
              <Switch checked={filters.onlyInStock} onCheckedChange={(v) => update({ onlyInStock: v })} className="scale-[0.75] origin-right" />
            </div>
          </div>
        );
      case "rapidas":
        return (
          <div className="space-y-1">
            {([
              { key: "onlyNew" as const, label: "🆕 Novidades", desc: "Lançamentos recentes" },
              { key: "onlyFeatured" as const, label: "⭐ Destaques", desc: "Produtos em destaque" },
              { key: "onlyKit" as const, label: "📦 Kits", desc: "Kits e combos" },
              { key: "onlyBestseller" as const, label: "🏆 Mais vendidos", desc: "Campeões de venda" },
              { key: "hasPersonalization" as const, label: "🎨 Personalização", desc: "Aceita gravação" },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-1 group/quick">
                <div>
                  <span className="text-[11px] text-foreground/80 font-medium">{label}</span>
                  <p className="text-[9px] text-muted-foreground/30 leading-tight">{desc}</p>
                </div>
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
            className="absolute inset-0 bg-black/50 backdrop-blur-[3px] z-20 rounded-2xl"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute left-0 top-0 bottom-0 z-30 w-[310px] max-w-[90%] bg-card/98 backdrop-blur-xl border-r border-border/20 rounded-l-2xl flex flex-col shadow-2xl shadow-black/20"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-border/10">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm shadow-primary/5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-semibold tracking-tight">Filtros</span>
                  {activeFiltersCount > 0 && (
                    <p className="text-[9px] text-primary font-bold leading-tight">
                      {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={onReset}
                    className="h-6 px-2 text-[9px] text-muted-foreground hover:text-destructive gap-1 rounded-lg"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Limpar
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 rounded-lg">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Global search */}
            <div className="px-3 pt-2 pb-1">
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
                <input
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Buscar seção de filtro…"
                  className="w-full h-7 pl-7 pr-2 rounded-lg border border-border/15 bg-muted/10 text-[11px] placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                />
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
                            count={getCount(sec.id)}
                            totalOptions={getTotalOptions(sec.id)}
                          />
                          <CollapsibleContent isOpen={openSections.has(sec.id)}>
                            {renderContent(sec.id)}
                          </CollapsibleContent>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Audio — always visible */}
                <div className="mt-4 pt-3 border-t border-border/10">
                  <div className="flex items-center justify-between px-1 py-1">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-lg bg-muted/20 flex items-center justify-center">
                        <Volume2 className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                      <div>
                        <span className="text-[11px] text-foreground/70 font-medium">Auto-play por voz</span>
                        <p className="text-[9px] text-muted-foreground/30 leading-tight">Reproduzir respostas automaticamente</p>
                      </div>
                    </div>
                    <Switch checked={autoPlayTts} onCheckedChange={onAutoPlayTtsChange} className="scale-[0.75] origin-right" />
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-3 py-2.5 border-t border-border/10">
              <Button size="sm" onClick={onClose} className="w-full h-9 rounded-xl text-[11px] font-semibold gap-1.5 shadow-sm">
                <Sparkles className="h-3 w-3" />
                Aplicar filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-1 h-4.5 min-w-5 px-1.5 rounded-full bg-primary-foreground/20 text-[10px] font-bold flex items-center justify-center">
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
