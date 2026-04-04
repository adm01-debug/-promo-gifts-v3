/**
 * GlobalSearchPalette — Refactored UI shell (~300 lines)
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
  Package, Users, FileText, ShoppingCart, ArrowRight, Loader2,
  BarChart3, Calculator, Wand2, Heart, TrendingUp, Sparkles,
  Brain, Clock, Flame, X, Mic, FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceSearchOverlay } from "./VoiceSearchOverlay";
import { useGlobalSearch } from "./useGlobalSearch";
import { typeConfig } from "./search-types";

const quickActions = [
  { id: "new-quote", title: "Novo Orçamento", description: "Criar um novo orçamento", icon: <FileText className="h-4 w-4" />, href: "/orcamentos/novo", shortcut: "N" },
  { id: "products", title: "Catálogo de Produtos", description: "Ver todos os produtos", icon: <Package className="h-4 w-4" />, href: "/" },
  { id: "quotes", title: "Orçamentos", description: "Ver todos os orçamentos", icon: <FileText className="h-4 w-4" />, href: "/orcamentos" },
  { id: "collections", title: "Coleções", description: "Ver suas coleções", icon: <FolderOpen className="h-4 w-4" />, href: "/colecoes" },
  { id: "favorites", title: "Favoritos", description: "Ver produtos favoritos", icon: <Heart className="h-4 w-4" />, href: "/favoritos" },
  { id: "simulator", title: "Simulador de Personalização", description: "Calcular custos de personalização", icon: <Calculator className="h-4 w-4" />, href: "/simulador" },
  { id: "mockup", title: "Gerador de Mockups", description: "Criar mockups com logo", icon: <Wand2 className="h-4 w-4" />, href: "/mockup" },
  { id: "bi", title: "Dashboard BI", description: "Análises e métricas", icon: <BarChart3 className="h-4 w-4" />, href: "/bi" },
  { id: "trends", title: "Tendências", description: "Análise de tendências", icon: <TrendingUp className="h-4 w-4" />, href: "/tendencias" },
];

export function GlobalSearchPalette() {
  const s = useGlobalSearch();

  return (
    <>
      {/* Trigger */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <button onClick={() => s.setOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors flex-1 md:w-56">
          <Brain className="h-4 w-4 text-primary" />
          <span className="flex-1 text-left">Busca inteligente...</span>
          <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground"><span className="text-xs">⌘</span>K</kbd>
        </button>
        {s.isVoiceSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={s.handleOpenVoiceOverlay} className="shrink-0 h-10 w-10 rounded-lg border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all">
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card border-border">Fala comigo Bebê!</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Voice overlay */}
      <VoiceSearchOverlay
        isOpen={s.voiceOverlayOpen} isListening={s.isListening}
        transcript={s.voiceTranscript} error={s.voiceError}
        onClose={s.handleCloseVoiceOverlay} onToggleListening={s.toggleVoiceSearch}
        commandAction={s.voiceCommandAction} appliedFilters={s.voiceAppliedFilters}
        frequentCommands={s.frequentCommands} recentCommands={s.recentCommands}
        onCommandSelect={s.handleVoiceResult}
      />

      {/* Command Dialog */}
      <CommandDialog open={s.open} onOpenChange={s.setOpen}>
        <CommandInput placeholder="Ex: canecas azuis baratas, orçamentos pendentes do João..." value={s.query} onValueChange={s.setQuery} />
        <CommandList className="max-h-[500px]">
          {/* AI indicator */}
          {s.isAIProcessing && (
            <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm text-primary">Analisando sua busca com IA...</span>
            </div>
          )}

          {/* Intent display */}
          {s.searchIntent && !s.isSearching && s.results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-muted/50 border-b">
              <Brain className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">Entendi:</span>
              {s.searchIntent.type !== "mixed" && (
                <Badge variant="outline" className="text-xs">
                  {{ product: "Produtos", client: "Clientes", quote: "Orçamentos", order: "Pedidos" }[s.searchIntent.type]}
                </Badge>
              )}
              {s.searchIntent.filters.category && <Badge variant="secondary" className="text-xs">{s.searchIntent.filters.category}</Badge>}
              {s.searchIntent.filters.color && <Badge variant="secondary" className="text-xs">Cor: {s.searchIntent.filters.color}</Badge>}
              {s.searchIntent.filters.priceRange && <Badge variant="secondary" className="text-xs">{{ low: "Preço baixo", medium: "Preço médio", high: "Premium" }[s.searchIntent.filters.priceRange]}</Badge>}
              {s.searchIntent.filters.status && <Badge variant="secondary" className="text-xs">Status: {s.searchIntent.filters.status}</Badge>}
              {s.searchIntent.filters.clientName && <Badge variant="secondary" className="text-xs">Cliente: {s.searchIntent.filters.clientName}</Badge>}
            </div>
          )}

          {s.isSearching && !s.isAIProcessing && (
            <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          )}

          {!s.isSearching && s.query.length >= 3 && s.results.length === 0 && (
            <CommandEmpty>Nenhum resultado encontrado para "{s.query}"</CommandEmpty>
          )}

          {/* Results */}
          {!s.isSearching && Object.entries(s.groupedResults).map(([type, items]) => {
            const config = typeConfig[type];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <CommandGroup key={type} heading={config.label + "s"}>
                {items.map(result => (
                  <CommandItem key={result.id} value={result.title} onSelect={() => s.handleSelect(result.href)} className="flex items-center gap-3 py-3">
                    <div className={`p-2 rounded-lg ${config.color}/10`}><Icon className={`h-4 w-4 ${config.color.replace("bg-", "text-")}`} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.subtitle && <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>}
                    </div>
                    <Badge variant="outline" className="shrink-0">{config.label}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {/* Typing suggestions */}
          {s.typingSuggestions.length > 0 && s.query.length >= 2 && s.query.length < 5 && !s.isSearching && (
            <CommandGroup heading="Sugestões">
              {s.typingSuggestions.map((suggestion, i) => (
                <CommandItem key={`sug-${i}`} value={`suggestion-${suggestion}`} onSelect={() => s.handleSuggestionClick(suggestion)} className="flex items-center gap-3 py-2">
                  <div className="p-2 rounded-lg bg-primary/10"><Sparkles className="h-4 w-4 text-primary" /></div>
                  <span className="flex-1">{suggestion}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Idle state */}
          {s.query.length < 2 && (
            <>
              {s.history.length > 0 && (
                <CommandGroup heading="Buscas Recentes">
                  {s.history.slice(0, 5).map((term, i) => (
                    <CommandItem key={`h-${i}`} value={`history-${term}`} onSelect={() => s.handleSuggestionClick(term)} className="flex items-center gap-3 py-2 group">
                      <div className="p-2 rounded-lg bg-muted"><Clock className="h-4 w-4 text-muted-foreground" /></div>
                      <span className="flex-1">{term}</span>
                      <button onClick={e => s.handleRemoveFromHistory(e, term)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity">
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {s.popularProducts.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Produtos Populares">
                    {s.popularProducts.map(product => (
                      <CommandItem key={`pop-${product.id}`} value={`popular-${product.name}`} onSelect={() => s.handleSelect(`/produto/${product.id}`, false)} className="flex items-center gap-3 py-2">
                        <div className="p-2 rounded-lg bg-orange-500/10"><Flame className="h-4 w-4 text-orange-500" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku} • {product.view_count} visualizações</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">Popular</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {s.contextualSuggestions.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={`Sugestões para ${s.routeContext.section === "products" ? "Catálogo" : s.routeContext.section === "quotes" ? "Orçamentos" : s.routeContext.section === "orders" ? "Pedidos" : s.routeContext.section === "clients" ? "Clientes" : "Esta Página"}`}>
                    <div className="flex flex-wrap gap-2 p-2">
                      {s.contextualSuggestions.slice(0, 6).map(sug => (
                        <button key={sug.id} onClick={() => s.handleSuggestionClick(sug.text)} className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors",
                          sug.type === "filter" && "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30",
                          sug.type === "navigation" && "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30",
                          sug.type === "action" && "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30",
                          sug.type === "search" && "bg-muted hover:bg-muted/80",
                        )}>
                          <span>{sug.icon}</span><span>{sug.text}</span>
                        </button>
                      ))}
                    </div>
                  </CommandGroup>
                </>
              )}

              <CommandSeparator />
              <CommandGroup heading="Sugestões Rápidas">
                <div className="flex flex-wrap gap-2 p-2">
                  {s.quickSuggestions.map((qs, i) => (
                    <button key={`q-${i}`} onClick={() => s.handleSuggestionClick(qs.label)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors">
                      <span>{qs.icon}</span><span>{qs.label}</span>
                    </button>
                  ))}
                </div>
              </CommandGroup>

              <CommandSeparator />
              <CommandGroup heading="Ações Rápidas">
                {quickActions.slice(0, 5).map(action => (
                  <CommandItem key={action.id} value={action.title} onSelect={() => s.handleSelect(action.href, false)} className="flex items-center gap-3 py-2">
                    <div className="p-2 rounded-lg bg-primary/10">{action.icon}</div>
                    <div className="flex-1"><p className="font-medium">{action.title}</p><p className="text-sm text-muted-foreground">{action.description}</p></div>
                    {action.shortcut && <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">{action.shortcut}</kbd>}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />
              <CommandGroup heading="Navegação">
                {quickActions.slice(5).map(action => (
                  <CommandItem key={action.id} value={action.title} onSelect={() => s.handleSelect(action.href, false)} className="flex items-center gap-3 py-2">
                    <div className="p-2 rounded-lg bg-muted">{action.icon}</div>
                    <div className="flex-1"><p className="font-medium">{action.title}</p><p className="text-sm text-muted-foreground">{action.description}</p></div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
