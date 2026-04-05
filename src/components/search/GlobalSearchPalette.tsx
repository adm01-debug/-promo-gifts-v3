/**
 * GlobalSearchPalette — Premium 10/10 with CSS animations (cmdk-compatible)
 * framer-motion used only for standalone elements outside cmdk tree
 */
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
  Compass, Zap, Trophy, Medal, Hash, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { VoiceSearchOverlay } from "./VoiceSearchOverlay";
import { useGlobalSearch } from "./useGlobalSearch";
import { typeConfig } from "./search-types";

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

/* ── Rank icon per position ── */
function RankIcon({ index }: { index: number }) {
  if (index === 0) return (
    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange to-orange/70 flex items-center justify-center shadow-sm shadow-orange/20 animate-[pulse-glow_2s_ease-in-out_infinite]">
      <Trophy className="h-4 w-4 text-white" />
    </div>
  );
  if (index === 1) return (
    <div className="h-8 w-8 rounded-lg bg-muted/80 flex items-center justify-center border border-border/50">
      <Medal className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  return (
    <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center border border-border/30">
      <span className="text-xs font-bold text-muted-foreground/60">{index + 1}º</span>
    </div>
  );
}

/* ── Section Divider with label ── */
function SectionDivider({ icon, label, count, action }: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 pt-4 pb-2">
      <div className="h-5 w-5 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
        <span className="text-primary/70 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 font-display">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-medium text-muted-foreground/40 bg-muted/60 rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">{count}</span>
      )}
      {action && <div className="ml-auto">{action}</div>}
      <div className="flex-1 h-px bg-gradient-to-r from-border/40 to-transparent ml-1" />
    </div>
  );
}

/* ── CSS stagger animation style helper ── */
function staggerStyle(index: number, baseDelay = 0): React.CSSProperties {
  return {
    animationDelay: `${baseDelay + index * 40}ms`,
  };
}

export function GlobalSearchPalette() {
  const s = useGlobalSearch();

  return (
    <>
      {/* ── Trigger ── */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <button
          onClick={() => s.setOpen(true)}
          className="group relative flex items-center gap-2.5 px-3.5 py-2 text-sm rounded-xl border border-border/30 hover:border-primary/30 bg-muted/20 hover:bg-muted/40 transition-all duration-300 flex-1 md:w-64 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.03] to-primary/0 group-hover:via-primary/[0.06] transition-all duration-500 pointer-events-none" />
          <div className="relative h-6 w-6 rounded-lg bg-primary/8 group-hover:bg-primary/12 flex items-center justify-center transition-colors duration-300">
            <Brain className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors duration-300" />
            <div className="absolute inset-0 rounded-lg bg-primary/10 animate-[brain-glow_3s_ease-in-out_infinite] pointer-events-none" />
          </div>
          <span className="relative flex-1 text-left text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors duration-300 text-[13px]">Busca inteligente...</span>
          <kbd className="relative hidden md:inline-flex h-5 items-center gap-0.5 rounded-md border border-border/30 bg-muted/30 group-hover:border-primary/20 group-hover:bg-primary/5 px-1.5 font-mono text-[10px] text-muted-foreground/40 group-hover:text-primary/50 transition-all duration-300">
            ⌘K
          </kbd>
        </button>
        {s.isVoiceSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={s.handleOpenVoiceOverlay} className="shrink-0 h-10 w-10 rounded-xl border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all">
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card border-border text-xs">Busca por voz</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ── Voice overlay ── */}
      <VoiceSearchOverlay
        isOpen={s.voiceOverlayOpen} isListening={s.isListening}
        transcript={s.voiceTranscript} error={s.voiceError}
        onClose={s.handleCloseVoiceOverlay} onToggleListening={s.toggleVoiceSearch}
        commandAction={s.voiceCommandAction} appliedFilters={s.voiceAppliedFilters}
        frequentCommands={s.frequentCommands} recentCommands={s.recentCommands}
        onCommandSelect={s.handleVoiceResult}
      />

      {/* ── Command Dialog ── */}
      <CommandDialog open={s.open} onOpenChange={s.setOpen}>
        <div className="relative">
          <CommandInput
            placeholder="Buscar produtos, orçamentos, clientes..."
            value={s.query}
            onValueChange={s.setQuery}
          />
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>

        <CommandList className="max-h-[480px] scrollbar-thin">
          {/* ── AI Processing ── */}
          {s.isAIProcessing && (
            <div className="flex items-center gap-3 px-4 py-3 mx-2 mt-2 rounded-xl bg-gradient-to-r from-primary/8 via-primary/5 to-transparent border border-primary/10 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-pulse">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary font-display">Analisando sua busca...</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">IA identificando intenção e filtros</p>
              </div>
              <Loader2 className="h-4 w-4 text-primary/40 animate-spin" />
            </div>
          )}

          {/* ── Intent display ── */}
          {s.searchIntent && !s.isSearching && s.results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 mx-2 mt-2 rounded-lg bg-muted/30 border border-border/30 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
                <Brain className="h-3 w-3 text-primary" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground/70">Entendi:</span>
              {s.searchIntent.type !== "mixed" && (
                <Badge variant="outline" className="text-[11px] h-5 rounded-md">
                  {{ product: "Produtos", client: "Clientes", quote: "Orçamentos", order: "Pedidos" }[s.searchIntent.type]}
                </Badge>
              )}
              {s.searchIntent.filters.category && <Badge variant="secondary" className="text-[11px] h-5 rounded-md">{s.searchIntent.filters.category}</Badge>}
              {s.searchIntent.filters.color && <Badge variant="secondary" className="text-[11px] h-5 rounded-md">Cor: {s.searchIntent.filters.color}</Badge>}
              {s.searchIntent.filters.priceRange && <Badge variant="secondary" className="text-[11px] h-5 rounded-md">{{ low: "Preço baixo", medium: "Preço médio", high: "Premium" }[s.searchIntent.filters.priceRange]}</Badge>}
              {s.searchIntent.filters.status && <Badge variant="secondary" className="text-[11px] h-5 rounded-md">Status: {s.searchIntent.filters.status}</Badge>}
              {s.searchIntent.filters.clientName && <Badge variant="secondary" className="text-[11px] h-5 rounded-md">Cliente: {s.searchIntent.filters.clientName}</Badge>}
            </div>
          )}

          {/* ── Loading ── */}
          {s.isSearching && !s.isAIProcessing && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 animate-in fade-in-0 duration-300">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
              </div>
              <p className="text-xs text-muted-foreground/60">Buscando resultados...</p>
            </div>
          )}

          {/* ── Empty state ── */}
          {!s.isSearching && s.query.length >= 3 && s.results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/30">
                <Search className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground/70">Nenhum resultado para "<span className="font-semibold text-foreground/80">{s.query}</span>"</p>
                <p className="text-xs text-muted-foreground/40 mt-1">Tente termos diferentes ou mais curtos</p>
              </div>
            </div>
          )}

          {/* ── Short query hint ── */}
          {!s.isSearching && s.query.length >= 1 && s.query.length < 3 && (
            <div className="flex items-center justify-center gap-2 px-4 py-5 animate-in fade-in-0 duration-200">
              <div className="h-6 w-6 rounded-md bg-muted/50 flex items-center justify-center">
                <Search className="h-3 w-3 text-muted-foreground/30" />
              </div>
              <span className="text-xs text-muted-foreground/40">Continue digitando para buscar...</span>
            </div>
          )}

          {/* ── Search Results ── */}
          {!s.isSearching && Object.entries(s.groupedResults).map(([type, items]) => {
            const config = typeConfig[type];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <CommandGroup key={type} heading={config.label + "s"} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                {items.map((result, i) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => s.handleSelect(result.href)}
                    className="flex items-center gap-3 py-2.5 rounded-xl mx-1.5 px-2.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
                    style={staggerStyle(i, 50)}
                  >
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", `${config.color}/10`)}>
                      <Icon className={cn("h-4 w-4", config.color.replace("bg-", "text-"))} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{result.title}</p>
                      {result.subtitle && <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{result.subtitle}</p>}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] h-5 rounded-md border-border/40">{config.label}</Badge>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/25" />
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
                  className="flex items-center gap-3 py-2.5 rounded-xl mx-1.5 px-2.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
                  style={staggerStyle(i)}
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                  </div>
                  <span className="flex-1 text-sm">{suggestion}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/25" />
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
                <div className="px-1 animate-in fade-in-0 duration-200">
                  <SectionDivider icon={<Clock />} label="Recentes" count={s.history.length} />
                  <div className="space-y-0.5 px-1">
                    {s.history.slice(0, 4).map((term, i) => (
                      <CommandItem
                        key={`h-${i}`}
                        value={`history-${term}`}
                        onSelect={() => s.handleSuggestionClick(term)}
                        className="flex items-center gap-3 py-2 rounded-xl px-2.5 group animate-in fade-in-0 slide-in-from-left-2 duration-200"
                        style={staggerStyle(i)}
                      >
                        <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 group-data-[selected=true]:bg-accent">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </div>
                        <span className="flex-1 text-sm truncate">{term}</span>
                        <button
                          onClick={e => s.handleRemoveFromHistory(e, term)}
                          aria-label={`Remover "${term}" do histórico`}
                          className="opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 h-7 w-7 flex items-center justify-center hover:bg-destructive/10 rounded-lg transition-all"
                        >
                          <X className="h-3 w-3 text-muted-foreground/50 hover:text-destructive" aria-hidden="true" />
                        </button>
                      </CommandItem>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Produtos Populares ── */}
              {s.popularProducts.length > 0 && (
                <div className="px-1 animate-in fade-in-0 duration-300" style={{ animationDelay: '80ms' }}>
                  <SectionDivider icon={<Flame />} label="Mais Populares" count={s.popularProducts.length} />
                  <div className="space-y-0.5 px-1">
                    {s.popularProducts.map((product, idx) => (
                      <CommandItem
                        key={`pop-${product.id}`}
                        value={`popular-${product.name}`}
                        onSelect={() => s.handleSelect(`/produto/${product.id}`, false)}
                        className={cn(
                          "flex items-center gap-3 py-2.5 rounded-xl px-2.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
                          idx === 0 && "bg-orange/[0.04]"
                        )}
                        style={staggerStyle(idx, 100)}
                      >
                        <RankIcon index={idx} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm truncate", idx === 0 ? "font-semibold" : "font-medium")}>{product.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-muted-foreground/50 font-mono">{product.sku}</span>
                            <span className="text-muted-foreground/20">·</span>
                            <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground/40">
                              <Eye className="h-3 w-3" />
                              <span>{product.view_count} views</span>
                            </div>
                          </div>
                        </div>
                        {idx === 0 ? (
                          <Badge className="shrink-0 text-[10px] h-5 rounded-md bg-orange/15 text-orange border-orange/20 hover:bg-orange/20">
                            🔥 Top
                          </Badge>
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20" />
                        )}
                      </CommandItem>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Sugestões Contextuais ── */}
              {s.contextualSuggestions.length > 0 && (
                <div className="px-1 animate-in fade-in-0 duration-300" style={{ animationDelay: '160ms' }}>
                  <SectionDivider
                    icon={<Sparkles />}
                    label={s.routeContext.section === "products" ? "Para o Catálogo" : s.routeContext.section === "quotes" ? "Para Orçamentos" : "Sugestões"}
                  />
                  <div className="flex flex-wrap gap-2 px-3 pb-3" role="group" aria-label="Sugestões contextuais">
                    {s.contextualSuggestions.slice(0, 6).map((sug, i) => (
                      <motion.button
                        key={sug.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15, delay: 0.2 + i * 0.04 }}
                        onClick={() => s.handleSuggestionClick(sug.text)}
                        aria-label={`Buscar ${sug.text}`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150",
                          sug.type === "filter" && "bg-primary/6 hover:bg-primary/12 text-primary/80 hover:text-primary border border-primary/15 hover:border-primary/30",
                          sug.type === "navigation" && "bg-accent/40 hover:bg-accent/70 text-accent-foreground/80 border border-accent-foreground/8",
                          sug.type === "action" && "bg-orange/6 hover:bg-orange/12 text-orange/80 hover:text-orange border border-orange/15 hover:border-orange/30",
                          sug.type === "search" && "bg-muted/50 hover:bg-muted/80 text-muted-foreground/70 hover:text-muted-foreground border border-border/30 hover:border-border/60",
                        )}
                      >
                        <span className="text-sm leading-none">{sug.icon}</span>
                        <span>{sug.text}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Atalhos Rápidos ── */}
              <div className="px-1 animate-in fade-in-0 duration-300" style={{ animationDelay: '240ms' }}>
                <SectionDivider icon={<Zap />} label="Atalhos" />
                <div className="flex flex-wrap gap-1.5 px-3 pb-3" role="group" aria-label="Atalhos rápidos">
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
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30 hover:bg-muted/60 rounded-lg text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150 border border-transparent hover:border-border/30"
                    >
                      <span className="text-sm leading-none opacity-60">{qs.icon}</span>
                      <span>{qs.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ── Ir Para ── */}
              <div className="px-1 pb-1 animate-in fade-in-0 duration-300" style={{ animationDelay: '320ms' }}>
                <SectionDivider icon={<Compass />} label="Ir Para" count={quickActions.length} />
                <div className="grid grid-cols-1 gap-0.5 px-1">
                  {quickActions.map((action, i) => (
                    <CommandItem
                      key={action.id}
                      value={action.title}
                      onSelect={() => s.handleSelect(action.href, false)}
                      className={cn(
                        "flex items-center gap-3 py-2 rounded-xl px-2.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
                        (action as any).highlight && "bg-gradient-to-r from-primary/6 to-transparent"
                      )}
                      style={staggerStyle(i, 340)}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        (action as any).highlight
                          ? "bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10"
                          : "bg-muted/50 text-muted-foreground/60"
                      )}>
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", (action as any).highlight ? "font-semibold text-primary" : "font-medium")}>{action.title}</p>
                        <p className="text-[11px] text-muted-foreground/40 truncate">{action.description}</p>
                      </div>
                      {action.shortcut && (
                        <kbd className="hidden md:inline-flex h-5 min-w-[22px] items-center justify-center rounded-md bg-muted/50 border border-border/30 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/40">
                          {action.shortcut}
                        </kbd>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20" />
                    </CommandItem>
                  ))}
                </div>
              </div>
            </>
          )}
        </CommandList>

        {/* ── Keyboard shortcuts footer ── */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-muted/10 select-none">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground/40">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center h-[18px] min-w-[20px] rounded bg-muted/60 border border-border/30 font-mono text-[10px] leading-none px-1">↵</kbd>
              <span>Selecionar</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center h-[18px] min-w-[20px] rounded bg-muted/60 border border-border/30 font-mono text-[10px] leading-none px-1">↑↓</kbd>
              <span>Navegar</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center h-[18px] min-w-[20px] rounded bg-muted/60 border border-border/30 font-mono text-[10px] leading-none px-1">ESC</kbd>
              <span>Fechar</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/30">
            <Brain className="h-3 w-3" />
            <span>Busca com IA</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
