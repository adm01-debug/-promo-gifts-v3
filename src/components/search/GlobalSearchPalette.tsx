/**
 * GlobalSearchPalette — Premium redesign with visual hierarchy
 * All search logic extracted to useGlobalSearch hook.
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
  Compass, Zap,
} from "lucide-react";
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

/* ── Section Header ── */
function SectionLabel({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-3 pb-1.5">
      <span className="text-muted-foreground/70">{icon}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-medium text-muted-foreground/40 bg-muted rounded-full px-1.5 py-0.5 leading-none">{count}</span>
      )}
    </div>
  );
}

export function GlobalSearchPalette() {
  const s = useGlobalSearch();

  return (
    <>
      {/* ── Trigger ── */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <button onClick={() => s.setOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors flex-1 md:w-56">
          <Brain className="h-4 w-4 text-primary" />
          <span className="flex-1 text-left">Busca inteligente...</span>
        </button>
        {s.isVoiceSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={s.handleOpenVoiceOverlay} className="shrink-0 h-10 w-10 rounded-lg border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all">
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
        <CommandInput placeholder="Ex: canecas azuis baratas, orçamentos pendentes do João..." value={s.query} onValueChange={s.setQuery} />

        <CommandList className="max-h-[520px]">
          {/* ── AI Processing indicator ── */}
          {s.isAIProcessing && (
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/10">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Analisando sua busca com IA...</p>
                <p className="text-[11px] text-muted-foreground">Entendendo o que você procura</p>
              </div>
            </div>
          )}

          {/* ── Intent display ── */}
          {s.searchIntent && !s.isSearching && s.results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/50">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Entendi:</span>
              {s.searchIntent.type !== "mixed" && (
                <Badge variant="outline" className="text-[11px] h-5">
                  {{ product: "Produtos", client: "Clientes", quote: "Orçamentos", order: "Pedidos" }[s.searchIntent.type]}
                </Badge>
              )}
              {s.searchIntent.filters.category && <Badge variant="secondary" className="text-[11px] h-5">{s.searchIntent.filters.category}</Badge>}
              {s.searchIntent.filters.color && <Badge variant="secondary" className="text-[11px] h-5">Cor: {s.searchIntent.filters.color}</Badge>}
              {s.searchIntent.filters.priceRange && <Badge variant="secondary" className="text-[11px] h-5">{{ low: "Preço baixo", medium: "Preço médio", high: "Premium" }[s.searchIntent.filters.priceRange]}</Badge>}
              {s.searchIntent.filters.status && <Badge variant="secondary" className="text-[11px] h-5">Status: {s.searchIntent.filters.status}</Badge>}
              {s.searchIntent.filters.clientName && <Badge variant="secondary" className="text-[11px] h-5">Cliente: {s.searchIntent.filters.clientName}</Badge>}
            </div>
          )}

          {/* ── Loading ── */}
          {s.isSearching && !s.isAIProcessing && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
              <p className="text-xs text-muted-foreground">Buscando...</p>
            </div>
          )}

          {/* ── Empty ── */}
          {!s.isSearching && s.query.length >= 3 && s.results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum resultado para "<span className="font-medium text-foreground">{s.query}</span>"</p>
              <p className="text-xs text-muted-foreground/60">Tente termos diferentes ou mais curtos</p>
            </div>
          )}

          {/* ── Hint for short queries ── */}
          {!s.isSearching && s.query.length >= 1 && s.query.length < 3 && (
            <div className="flex items-center gap-2 px-4 py-4 justify-center">
              <Search className="h-3.5 w-3.5 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground/50">Continue digitando para buscar...</span>
            </div>
          )}

          {/* ── Search Results ── */}
          {!s.isSearching && Object.entries(s.groupedResults).map(([type, items]) => {
            const config = typeConfig[type];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <CommandGroup key={type} heading={config.label + "s"}>
                {items.map(result => (
                  <CommandItem key={result.id} value={result.title} onSelect={() => s.handleSelect(result.href)} className="flex items-center gap-3 py-3 rounded-lg mx-1">
                    <div className={`p-2 rounded-lg ${config.color}/10`}><Icon className={`h-4 w-4 ${config.color.replace("bg-", "text-")}`} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{result.title}</p>
                      {result.subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] h-5">{config.label}</Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {/* ── Typing suggestions ── */}
          {s.typingSuggestions.length > 0 && s.query.length >= 2 && s.query.length < 5 && !s.isSearching && (
            <CommandGroup heading="Sugestões">
              {s.typingSuggestions.map((suggestion, i) => (
                <CommandItem key={`sug-${i}`} value={`suggestion-${suggestion}`} onSelect={() => s.handleSuggestionClick(suggestion)} className="flex items-center gap-3 py-2 rounded-lg mx-1">
                  <div className="p-1.5 rounded-md bg-primary/10"><Sparkles className="h-3.5 w-3.5 text-primary" /></div>
                  <span className="flex-1 text-sm">{suggestion}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* ── IDLE STATE (no search query) ──      */}
          {/* ═══════════════════════════════════════ */}
          {s.query.length < 2 && (
            <>
              {/* ── Buscas Recentes ── */}
              {s.history.length > 0 && (
                <div className="px-1 pb-1">
                  <SectionLabel icon={<Clock className="h-3.5 w-3.5" />} label="Recentes" />
                  {s.history.slice(0, 4).map((term, i) => (
                    <CommandItem key={`h-${i}`} value={`history-${term}`} onSelect={() => s.handleSuggestionClick(term)} className="flex items-center gap-3 py-2 rounded-lg mx-1 group">
                      <div className="h-7 w-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                      <span className="flex-1 text-sm truncate">{term}</span>
                      <button onClick={e => s.handleRemoveFromHistory(e, term)} aria-label={`Remover "${term}" do histórico`} className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center hover:bg-destructive/10 rounded-md transition-all">
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" aria-hidden="true" />
                      </button>
                    </CommandItem>
                  ))}
                </div>
              )}

              {/* ── Produtos Populares ── */}
              {s.popularProducts.length > 0 && (
                <div className="px-1 pb-1">
                  <CommandSeparator className="mb-0" />
                  <SectionLabel icon={<Flame className="h-3.5 w-3.5" />} label="Populares" count={s.popularProducts.length} />
                  {s.popularProducts.map((product, idx) => (
                    <CommandItem key={`pop-${product.id}`} value={`popular-${product.name}`} onSelect={() => s.handleSelect(`/produto/${product.id}`, false)} className="flex items-center gap-3 py-2 rounded-lg mx-1">
                      <div className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold",
                        idx === 0 && "bg-orange/15 text-orange",
                        idx === 1 && "bg-muted text-muted-foreground",
                        idx >= 2 && "bg-muted/60 text-muted-foreground/60",
                      )}>
                        {idx === 0 ? <Flame className="h-3.5 w-3.5" /> : `${idx + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                          <span className="font-mono">{product.sku}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <Eye className="h-3 w-3" />
                          <span>{product.view_count}</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px] h-5 border-orange/30 text-orange/80">Popular</Badge>
                    </CommandItem>
                  ))}
                </div>
              )}

              {/* ── Sugestões Contextuais ── */}
              {s.contextualSuggestions.length > 0 && (
                <div className="px-1 pb-1">
                  <CommandSeparator className="mb-0" />
                  <SectionLabel
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    label={s.routeContext.section === "products" ? "Sugestões para Catálogo" : s.routeContext.section === "quotes" ? "Sugestões para Orçamentos" : "Sugestões"}
                  />
                  <div className="flex flex-wrap gap-1.5 px-3 pb-2" role="group" aria-label="Sugestões contextuais">
                    {s.contextualSuggestions.slice(0, 6).map(sug => (
                      <button key={sug.id} onClick={() => s.handleSuggestionClick(sug.text)} aria-label={`Buscar ${sug.text}`} className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        sug.type === "filter" && "bg-primary/8 hover:bg-primary/15 text-primary border border-primary/25 hover:border-primary/50",
                        sug.type === "navigation" && "bg-accent/50 hover:bg-accent text-accent-foreground border border-accent-foreground/10",
                        sug.type === "action" && "bg-orange/8 hover:bg-orange/15 text-orange border border-orange/25 hover:border-orange/50",
                        sug.type === "search" && "bg-muted/60 hover:bg-muted text-muted-foreground border border-border/50",
                      )}>
                        <span>{sug.icon}</span><span>{sug.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Sugestões Rápidas (compact tags) ── */}
              <div className="px-1 pb-1">
                <CommandSeparator className="mb-0" />
                <SectionLabel icon={<Zap className="h-3.5 w-3.5" />} label="Atalhos" />
                <div className="flex flex-wrap gap-1.5 px-3 pb-2" role="group" aria-label="Sugestões rápidas">
                  {s.quickSuggestions.map((qs, i) => (
                    <button key={`q-${i}`} onClick={() => s.handleSuggestionClick(qs.label)} aria-label={`Buscar ${qs.label}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted/50 hover:bg-muted rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/50">
                      <span className="text-sm leading-none">{qs.icon}</span><span>{qs.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Ir Para (unified navigation) ── */}
              <div className="px-1 pb-1">
                <CommandSeparator className="mb-0" />
                <SectionLabel icon={<Compass className="h-3.5 w-3.5" />} label="Ir Para" />
                <div className="grid grid-cols-1 gap-0.5">
                  {quickActions.map(action => (
                    <CommandItem key={action.id} value={action.title} onSelect={() => s.handleSelect(action.href, false)} className={cn(
                      "flex items-center gap-3 py-2 rounded-lg mx-1",
                      (action as any).highlight && "bg-primary/5"
                    )}>
                      <div className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                        (action as any).highlight ? "bg-primary/10 text-primary" : "bg-muted/80 text-muted-foreground/70"
                      )}>
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", (action as any).highlight ? "font-semibold" : "font-medium")}>{action.title}</p>
                        <p className="text-[11px] text-muted-foreground/50 truncate">{action.description}</p>
                      </div>
                      {action.shortcut && (
                        <kbd className="hidden md:inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted border border-border/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60">{action.shortcut}</kbd>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                    </CommandItem>
                  ))}
                </div>
              </div>
            </>
          )}
        </CommandList>

        {/* ── Keyboard shortcuts footer ── */}
        <div className="flex items-center justify-center gap-5 px-4 py-2 border-t border-border/50 bg-muted/20 text-[11px] text-muted-foreground/50 select-none">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted/80 border border-border/50 font-mono text-[10px] leading-none">↵</kbd>
            <span>Selecionar</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted/80 border border-border/50 font-mono text-[10px] leading-none">↑↓</kbd>
            <span>Navegar</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted/80 border border-border/50 font-mono text-[10px] leading-none">ESC</kbd>
            <span>Fechar</span>
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
