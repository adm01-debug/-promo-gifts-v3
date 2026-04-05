/**
 * GlobalSearchPalette — High-contrast black redesign
 * Zero gray haze, sharp hierarchy, CSS animations (cmdk-compatible)
 */
import React, { lazy, Suspense } from "react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Package, FileText, ArrowRight, Loader2,
  BarChart3, Calculator, Wand2, Heart, TrendingUp, Sparkles,
  Brain, Clock, Flame, X, Mic, FolderOpen, Search, Eye,
  Compass, Zap, Trophy, Medal, Hash, ChevronRight, ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "./useGlobalSearch";
import { typeConfig } from "./search-types";

const LazyVoiceOverlay = lazy(() => import("./VoiceSearchOverlayConnected"));

/* ── Quick Actions ── */
const quickActions = [
  { id: "new-quote", title: "Novo Orçamento", description: "Criar um novo orçamento", icon: <FileText className="h-4 w-4" />, href: "/orcamentos/novo", shortcut: "N", highlight: true },
  { id: "products", title: "Catálogo de Produtos", description: "Ver todos os produtos", icon: <Package className="h-4 w-4" />, href: "/" },
  { id: "quotes", title: "Orçamentos", description: "Ver todos os orçamentos", icon: <FileText className="h-4 w-4" />, href: "/orcamentos" },
  { id: "collections", title: "Coleções", description: "Ver suas coleções", icon: <FolderOpen className="h-4 w-4" />, href: "/colecoes" },
  { id: "favorites", title: "Favoritos", description: "Ver produtos favoritos", icon: <Heart className="h-4 w-4" />, href: "/favoritos" },
  { id: "simulator", title: "Simulador de Personalização", description: "Calcular custos de personalização", icon: <Calculator className="h-4 w-4" />, href: "/simulador" },
  { id: "mockup", title: "Gerador de Mockups", description: "Criar mockups com logo", icon: <Wand2 className="h-4 w-4" />, href: "/mockup" },
  { id: "bi", title: "Dashboard BI", description: "Análises e métricas", icon: <BarChart3 className="h-4 w-4" />, href: "/bi" },
  { id: "trends", title: "Tendências", description: "Análise de tendências", icon: <TrendingUp className="h-4 w-4" />, href: "/tendencias" },
];

const paletteItemStateClass =
  "border border-transparent [background-color:transparent] transition-[background-color,border-color,color] data-[selected=true]:[background-color:hsl(var(--command-accent-strong))] data-[selected=true]:[border-color:hsl(var(--command-border-strong))] data-[selected=true]:text-foreground";

/* ── Rank badge with gradient ── */
function RankBadge({ index }: { index: number }) {
  if (index === 0) return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange via-orange/80 to-orange/60 flex items-center justify-center shadow-lg shadow-orange/25 animate-[brain-glow_3s_ease-in-out_infinite] ring-2 ring-orange/20">
      <Trophy className="h-4.5 w-4.5 text-primary-foreground drop-shadow-sm" />
    </div>
  );
  if (index === 1) return (
    <div className="h-10 w-10 rounded-xl [background-color:hsl(var(--command-surface-soft))] flex items-center justify-center border [border-color:hsl(var(--command-border-strong))] shadow-[inset_0_1px_0_hsl(var(--command-border)/0.4)]">
      <Medal className="h-4 w-4 [color:hsl(var(--command-text-muted))]" />
    </div>
  );
  if (index === 2) return (
    <div className="h-10 w-10 rounded-xl [background-color:hsl(var(--command-surface-raised))] flex items-center justify-center border [border-color:hsl(var(--command-border))]">
      <span className="text-xs font-bold [color:hsl(var(--command-text-muted))]">3º</span>
    </div>
  );
  return (
    <div className="h-10 w-10 rounded-xl [background-color:hsl(var(--command-surface-raised))] flex items-center justify-center border [border-color:hsl(var(--command-border))]">
      <span className="text-xs font-bold [color:hsl(var(--command-text-subtle))]">{index + 1}º</span>
    </div>
  );
}

/* ── Section Header — premium divider ── */
function SectionHeader({ icon, label, count, gradient }: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  gradient?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 pt-5 pb-2.5">
      <div className={cn(
        "h-6 w-6 rounded-lg flex items-center justify-center shrink-0",
        gradient || "bg-primary/10"
      )}>
        <span className="text-primary [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] [color:hsl(var(--command-text-subtle))] font-display">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 rounded-full font-bold [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-subtle))] border-0">
          {count}
        </Badge>
      )}
      <div className="flex-1 h-px ml-1 [background:linear-gradient(90deg,hsl(var(--command-border-strong)),hsl(var(--command-border)),transparent)]" />
    </div>
  );
}

/* ── CSS stagger animation style helper ── */
function staggerStyle(index: number, baseDelay = 0): React.CSSProperties {
  return {
    animationDelay: `${baseDelay + index * 50}ms`,
  };
}

/* ── Navigation Card for "Ir Para" — 2-column grid ── */
function NavCard({ action, index, onSelect }: {
  action: typeof quickActions[0];
  index: number;
  onSelect: (href: string) => void;
}) {
  const isHighlight = (action as any).highlight;
  return (
    <CommandItem
      value={action.title}
      onSelect={() => onSelect(action.href)}
      className={cn(
        "flex items-center gap-3 py-3 px-3 rounded-xl animate-in fade-in-0 slide-in-from-bottom-1 duration-200 cursor-pointer",
        paletteItemStateClass,
        isHighlight
          ? "bg-gradient-to-r from-primary/12 via-primary/6 to-transparent border border-primary/20"
          : "[background-color:hsl(var(--command-surface-raised))] hover:[background-color:hsl(var(--command-surface-soft))] [border-color:hsl(var(--command-border))] hover:[border-color:hsl(var(--command-border-strong))]"
      )}
      style={staggerStyle(index, 200)}
    >
      <div className={cn(
        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
        isHighlight
          ? "bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm shadow-primary/10"
          : "[background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]"
      )}>
        {action.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] truncate", isHighlight ? "font-semibold text-primary" : "font-medium")}>{action.title}</p>
        <p className="text-[10px] [color:hsl(var(--command-text-subtle))] truncate leading-tight mt-0.5">{action.description}</p>
      </div>
      {action.shortcut && (
        <kbd className="hidden md:inline-flex h-5 min-w-[22px] items-center justify-center rounded-md bg-primary/10 border border-primary/20 px-1.5 font-mono text-[10px] font-semibold text-primary/60">
          {action.shortcut}
        </kbd>
      )}
      <ArrowUpRight className={cn("h-3.5 w-3.5 shrink-0", isHighlight ? "text-primary/40" : "[color:hsl(var(--command-text-subtle))]")} />
    </CommandItem>
  );
}

export function GlobalSearchPalette() {
  const s = useGlobalSearch();

  return (
    <>
      {/* ── Trigger ── */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <button
          onClick={() => s.setOpen(true)}
          className="group relative flex items-center gap-2.5 px-3.5 py-2 text-sm rounded-xl border [border-color:hsl(var(--command-border))] hover:[border-color:hsl(var(--command-border-strong))] [background-color:hsl(var(--command-surface-raised))] hover:[background-color:hsl(var(--command-surface-soft))] transition-all duration-300 flex-1 md:w-64 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.03] to-primary/0 group-hover:via-primary/[0.06] transition-all duration-500 pointer-events-none" />
          <div className="relative h-6 w-6 rounded-lg bg-primary/8 group-hover:bg-primary/12 flex items-center justify-center transition-colors duration-300 shrink-0">
            <Brain className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors duration-300" />
            <div className="absolute inset-0 rounded-lg bg-primary/10 animate-[brain-glow_3s_ease-in-out_infinite] pointer-events-none" />
          </div>
          <span className="relative flex-1 text-left [color:hsl(var(--command-text-muted))] group-hover:text-foreground transition-colors duration-300 text-[13px]">Busca inteligente...</span>
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={s.handleOpenVoiceOverlay} className="shrink-0 h-10 w-10 rounded-xl border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all">
              <Mic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-card border-border text-xs">Assistente de voz IA</TooltipContent>
        </Tooltip>
      </div>

      {/* ── Voice overlay (lazy-loaded — @elevenlabs/react only loads when activated) ── */}
      {s.voiceOverlayOpen && (
        <Suspense fallback={null}>
          <LazyVoiceOverlay
            isOpen={s.voiceOverlayOpen}
            onClose={s.handleCloseVoiceOverlay}
            onAction={s.handleVoiceAction}
          />
        </Suspense>
      )}

      {/* ── Command Dialog ── */}
      <CommandDialog open={s.open} onOpenChange={s.setOpen}>
        {/* ── Search Input with gradient accent ── */}
        <div className="relative">
          <CommandInput
            placeholder="Buscar produtos, orçamentos, clientes..."
            value={s.query}
            onValueChange={s.setQuery}
          />
          <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>

        <CommandList className="max-h-[520px] scrollbar-thin px-1 [background-color:hsl(var(--command-surface))]">
          {/* ── AI Processing Banner ── */}
          {s.isAIProcessing && (
            <div className="flex items-center gap-3 px-4 py-3.5 mx-2 mt-3 rounded-2xl bg-gradient-to-r from-primary/12 via-primary/6 to-primary/3 border border-primary/15 shadow-sm shadow-primary/5 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center shadow-inner">
                <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary font-display">Analisando sua busca...</p>
                <p className="text-[11px] text-primary/50 mt-0.5">IA identificando intenção e filtros</p>
              </div>
              <Loader2 className="h-4 w-4 text-primary/40 animate-spin" />
            </div>
          )}

          {/* ── Intent chips ── */}
          {s.searchIntent && !s.isSearching && s.results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 mx-2 mt-3 rounded-xl border [border-color:hsl(var(--command-border))] [background:linear-gradient(90deg,hsl(var(--command-surface-raised)),hsl(var(--command-surface)))] animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div className="h-6 w-6 rounded-lg bg-primary/12 flex items-center justify-center">
                <Brain className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold [color:hsl(var(--command-text-muted))]">Entendi:</span>
              {s.searchIntent.type !== "mixed" && (
                <Badge variant="outline" className="text-[11px] h-5.5 rounded-lg font-semibold [border-color:hsl(var(--command-border-strong))] [background-color:hsl(var(--command-accent))]">
                  {{ product: "Produtos", client: "Clientes", quote: "Orçamentos", order: "Pedidos" }[s.searchIntent.type]}
                </Badge>
              )}
              {s.searchIntent.filters.category && <Badge variant="secondary" className="text-[11px] h-5.5 rounded-lg [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]">{s.searchIntent.filters.category}</Badge>}
              {s.searchIntent.filters.color && <Badge variant="secondary" className="text-[11px] h-5.5 rounded-lg [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]">Cor: {s.searchIntent.filters.color}</Badge>}
              {s.searchIntent.filters.priceRange && <Badge variant="secondary" className="text-[11px] h-5.5 rounded-lg [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]">{{ low: "Preço baixo", medium: "Preço médio", high: "Premium" }[s.searchIntent.filters.priceRange]}</Badge>}
              {s.searchIntent.filters.status && <Badge variant="secondary" className="text-[11px] h-5.5 rounded-lg [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]">Status: {s.searchIntent.filters.status}</Badge>}
              {s.searchIntent.filters.clientName && <Badge variant="secondary" className="text-[11px] h-5.5 rounded-lg [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]">Cliente: {s.searchIntent.filters.clientName}</Badge>}
            </div>
          )}

          {/* ── Loading state ── */}
          {s.isSearching && !s.isAIProcessing && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 animate-in fade-in-0 duration-300">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping opacity-30" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground/70">Buscando resultados...</p>
                <p className="text-[11px] text-muted-foreground/40 mt-1">Analisando catálogo com IA</p>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {!s.isSearching && s.query.length >= 3 && s.results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="h-16 w-16 rounded-2xl [background-color:hsl(var(--command-surface-raised))] flex items-center justify-center border [border-color:hsl(var(--command-border))] shadow-[inset_0_1px_0_hsl(var(--command-border)/0.35)]">
                <Search className="h-7 w-7 [color:hsl(var(--command-text-subtle))]" />
              </div>
              <div className="text-center">
                <p className="text-sm [color:hsl(var(--command-text-muted))]">Nenhum resultado para "<span className="font-semibold text-foreground">{s.query}</span>"</p>
                <p className="text-[11px] [color:hsl(var(--command-text-subtle))] mt-1.5">Tente termos diferentes ou mais curtos</p>
              </div>
            </div>
          )}

          {/* ── Short query hint ── */}
          {!s.isSearching && s.query.length >= 1 && s.query.length < 3 && (
            <div className="flex items-center justify-center gap-2.5 px-4 py-8 animate-in fade-in-0 duration-200">
              <div className="h-7 w-7 rounded-lg [background-color:hsl(var(--command-accent))] flex items-center justify-center">
                <Search className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
              </div>
              <span className="text-xs [color:hsl(var(--command-text-subtle))]">Continue digitando para buscar...</span>
            </div>
          )}

          {/* ── Search Results ── */}
          {!s.isSearching && Object.entries(s.groupedResults).map(([type, items]) => {
            const config = typeConfig[type];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <CommandGroup key={type} heading={config.label + "s"} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-4 [&_[cmdk-group-heading]]:pb-2">
                {items.map((result, i) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => s.handleSelect(result.href)}
                    className={cn("flex items-center gap-3.5 py-3 rounded-xl mx-2 px-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200", paletteItemStateClass)}
                    style={staggerStyle(i, 50)}
                  >
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", `${config.color}/10`)}>
                      <Icon className={cn("h-4.5 w-4.5", config.color.replace("bg-", "text-"))} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-[13px]">{result.title}</p>
                      {result.subtitle && <p className="text-[11px] [color:hsl(var(--command-text-muted))] truncate mt-0.5">{result.subtitle}</p>}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] h-5 rounded-lg [border-color:hsl(var(--command-border-strong))] [background-color:hsl(var(--command-accent))] font-medium">{config.label}</Badge>
                    <ChevronRight className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {/* ── Typing suggestions ── */}
          {s.typingSuggestions.length > 0 && s.query.length >= 2 && s.query.length < 5 && !s.isSearching && (
            <CommandGroup heading="Sugestões" className="animate-in fade-in-0 duration-200">
              {s.typingSuggestions.map((suggestion, i) => (
                <CommandItem
                  key={`sug-${i}`}
                  value={`suggestion-${suggestion}`}
                  onSelect={() => s.handleSuggestionClick(suggestion)}
                  className={cn("flex items-center gap-3.5 py-3 rounded-xl mx-2 px-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200", paletteItemStateClass)}
                  style={staggerStyle(i)}
                >
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary/70" />
                  </div>
                  <span className="flex-1 text-[13px] font-medium">{suggestion}</span>
                  <ChevronRight className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* ── IDLE STATE (no search query) ──      */}
          {/* ═══════════════════════════════════════ */}
          {s.query.length < 2 && !s.isSearching && (
            <>
              {/* ── Buscas Recentes ── */}
              {s.history.length > 0 && (
                <div className="animate-in fade-in-0 duration-200">
                  <SectionHeader icon={<Clock />} label="Recentes" count={s.history.length} gradient="[background-color:hsl(var(--command-accent))]" />
                  <div className="space-y-0.5 px-2">
                    {s.history.slice(0, 4).map((term, i) => (
                      <CommandItem
                        key={`h-${i}`}
                        value={`history-${term}`}
                        onSelect={() => s.handleSuggestionClick(term)}
                        className={cn("flex items-center gap-3.5 py-2.5 rounded-xl px-3 group animate-in fade-in-0 slide-in-from-left-2 duration-200", paletteItemStateClass)}
                        style={staggerStyle(i)}
                      >
                        <div className="h-9 w-9 rounded-xl [background-color:hsl(var(--command-accent))] flex items-center justify-center shrink-0 group-data-[selected=true]:[background-color:hsl(var(--command-accent-strong))]">
                          <Clock className="h-4 w-4 [color:hsl(var(--command-text-subtle))]" />
                        </div>
                        <span className="flex-1 text-[13px] truncate">{term}</span>
                        <button
                          onClick={e => s.handleRemoveFromHistory(e, term)}
                          aria-label={`Remover "${term}" do histórico`}
                          className="opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 h-7 w-7 flex items-center justify-center hover:bg-destructive/10 rounded-lg transition-all"
                        >
                          <X className="h-3 w-3 [color:hsl(var(--command-text-subtle))] hover:text-destructive" aria-hidden="true" />
                        </button>
                      </CommandItem>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Produtos Populares ── */}
              {s.popularProducts.length > 0 && (
                <div className="animate-in fade-in-0 duration-300" style={{ animationDelay: '80ms' }}>
                  <SectionHeader icon={<Flame />} label="Mais Populares" count={s.popularProducts.length} gradient="bg-gradient-to-br from-orange/15 to-orange/5" />
                  <div className="space-y-1 px-2">
                    {s.popularProducts.map((product, idx) => (
                      <CommandItem
                        key={`pop-${product.id}`}
                        value={`popular-${product.name}`}
                        onSelect={() => s.handleSelect(`/produto/${product.id}`, false)}
                        className={cn(
                          "flex items-center gap-3.5 py-3 rounded-xl px-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
                          paletteItemStateClass,
                          idx === 0 && "bg-gradient-to-r from-orange/[0.06] to-transparent border border-orange/10"
                        )}
                        style={staggerStyle(idx, 100)}
                      >
                        <RankBadge index={idx} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-[13px] truncate", idx === 0 ? "font-bold" : "font-medium")}>{product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] [color:hsl(var(--command-text-subtle))] font-mono [background-color:hsl(var(--command-accent))] px-1.5 py-0.5 rounded">{product.sku}</span>
                            <div className="flex items-center gap-1 text-[10px] [color:hsl(var(--command-text-subtle))]">
                              <Eye className="h-3 w-3" />
                              <span>{product.view_count}</span>
                            </div>
                          </div>
                        </div>
                        {idx === 0 ? (
                          <Badge className="shrink-0 text-[10px] h-6 rounded-lg bg-gradient-to-r from-orange/20 to-orange/10 text-orange border-orange/20 hover:bg-orange/25 font-semibold shadow-sm shadow-orange/10">
                            🔥 Top 1
                          </Badge>
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
                        )}
                      </CommandItem>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Sugestões Contextuais — pill chips ── */}
              {s.contextualSuggestions.length > 0 && (
                <div className="animate-in fade-in-0 duration-300" style={{ animationDelay: '160ms' }}>
                  <SectionHeader
                    icon={<Sparkles />}
                    label={s.routeContext.section === "products" ? "Para o Catálogo" : s.routeContext.section === "quotes" ? "Para Orçamentos" : "Sugestões"}
                    gradient="bg-gradient-to-br from-primary/12 to-primary/4"
                  />
                  <div className="flex flex-wrap gap-2 px-4 pb-2" role="group" aria-label="Sugestões contextuais">
                    {s.contextualSuggestions.slice(0, 6).map((sug, i) => (
                      <motion.button
                        key={sug.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15, delay: 0.2 + i * 0.04 }}
                        onClick={() => s.handleSuggestionClick(sug.text)}
                        aria-label={`Buscar ${sug.text}`}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className={cn(
                          "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 shadow-sm",
                          sug.type === "filter" && "bg-gradient-to-r from-primary/8 to-primary/4 hover:from-primary/15 hover:to-primary/8 text-primary/80 hover:text-primary border border-primary/15 hover:border-primary/30",
                          sug.type === "navigation" && "[background-color:hsl(var(--command-surface-raised))] hover:[background-color:hsl(var(--command-surface-soft))] text-foreground border [border-color:hsl(var(--command-border))] hover:[border-color:hsl(var(--command-border-strong))]",
                          sug.type === "action" && "bg-gradient-to-r from-orange/8 to-orange/4 hover:from-orange/15 hover:to-orange/8 text-orange/80 hover:text-orange border border-orange/15 hover:border-orange/30",
                          sug.type === "search" && "[background-color:hsl(var(--command-surface-raised))] hover:[background-color:hsl(var(--command-surface-soft))] [color:hsl(var(--command-text-muted))] hover:text-foreground border [border-color:hsl(var(--command-border))] hover:[border-color:hsl(var(--command-border-strong))]",
                        )}
                      >
                        <span className="text-sm leading-none">{sug.icon}</span>
                        <span>{sug.text}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Atalhos Rápidos — compact pills ── */}
              <div className="animate-in fade-in-0 duration-300" style={{ animationDelay: '240ms' }}>
                <SectionHeader icon={<Zap />} label="Atalhos" gradient="bg-gradient-to-br from-orange/12 to-orange/4" />
                <div className="flex flex-wrap gap-2 px-4 pb-2" role="group" aria-label="Atalhos rápidos">
                  {s.quickSuggestions.map((qs, i) => (
                    <motion.button
                      key={`q-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15, delay: 0.28 + i * 0.03 }}
                      onClick={() => s.handleSuggestionClick(qs.label)}
                      aria-label={`Buscar ${qs.label}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 [background-color:hsl(var(--command-surface-raised))] hover:[background-color:hsl(var(--command-surface-soft))] rounded-xl text-xs font-medium [color:hsl(var(--command-text-muted))] hover:text-foreground transition-all duration-150 border [border-color:hsl(var(--command-border))] hover:[border-color:hsl(var(--command-border-strong))] hover:shadow-sm"
                    >
                      <span className="text-sm leading-none opacity-70">{qs.icon}</span>
                      <span>{qs.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Ir Para — 2-column navigation grid ── */}
              <div className="pb-2 animate-in fade-in-0 duration-300" style={{ animationDelay: '320ms' }}>
                <SectionHeader icon={<Compass />} label="Ir Para" count={quickActions.length} gradient="bg-gradient-to-br from-primary/10 to-primary/4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 px-2">
                  {quickActions.map((action, i) => (
                    <NavCard
                      key={action.id}
                      action={action}
                      index={i}
                      onSelect={(href) => s.handleSelect(href, false)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </CommandList>

        {/* ── Premium Footer ── */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t [border-color:hsl(var(--command-border))] [background:linear-gradient(90deg,hsl(var(--command-surface-raised)),hsl(var(--command-surface)),hsl(var(--command-surface-raised)))] select-none">
          <div className="flex items-center gap-5 text-[11px] [color:hsl(var(--command-text-subtle))]">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center h-[18px] min-w-[20px] rounded-md [background-color:hsl(var(--command-accent))] border [border-color:hsl(var(--command-border))] font-mono text-[10px] leading-none px-1">↵</kbd>
              <span>Selecionar</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center h-[18px] min-w-[20px] rounded-md [background-color:hsl(var(--command-accent))] border [border-color:hsl(var(--command-border))] font-mono text-[10px] leading-none px-1">↑↓</kbd>
              <span>Navegar</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center h-[18px] min-w-[20px] rounded-md [background-color:hsl(var(--command-accent))] border [border-color:hsl(var(--command-border))] font-mono text-[10px] leading-none px-1">ESC</kbd>
              <span>Fechar</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-primary/40 font-medium">
            <div className="h-4 w-4 rounded-md bg-primary/8 flex items-center justify-center">
              <Brain className="h-2.5 w-2.5" />
            </div>
            <span>Busca com IA</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
