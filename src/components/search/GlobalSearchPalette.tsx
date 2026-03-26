import { ExternalProduct } from "@/types/external-db";
import { useEffect, useState, useCallback } from "react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Package,
  Users,
  FileText,
  ShoppingCart,
  ArrowRight,
  Loader2,
  FolderOpen,
  BarChart3,
  Calculator,
  Wand2,
  Heart,
  TrendingUp,
  Sparkles,
  Brain,
  Clock,
  Flame,
  X,
  Mic,
  Zap,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearch } from "@/hooks/useSearch";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVoiceCommandHistory } from "@/hooks/useVoiceCommandHistory";
import { useContextualSuggestions } from "@/hooks/useContextualSuggestions";
import { useVoiceFeedback } from "@/hooks/useVoiceFeedback";
import { VoiceSearchOverlay } from "./VoiceSearchOverlay";
import { createProductFuseOptions, rankProductSearchResults } from "@/utils/product-search";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "product" | "client" | "quote" | "order";
  href: string;
  metadata?: Record<string, unknown>;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  shortcut?: string;
}

const quickActions: QuickAction[] = [
  {
    id: "new-quote",
    title: "Novo Orçamento",
    description: "Criar um novo orçamento",
    icon: <FileText className="h-4 w-4" />,
    href: "/orcamentos/novo",
    shortcut: "N",
  },
  {
    id: "products",
    title: "Catálogo de Produtos",
    description: "Ver todos os produtos",
    icon: <Package className="h-4 w-4" />,
    href: "/",
  },
  {
    id: "quotes",
    title: "Orçamentos",
    description: "Ver todos os orçamentos",
    icon: <FileText className="h-4 w-4" />,
    href: "/orcamentos",
  },
  {
    id: "collections",
    title: "Coleções",
    description: "Ver suas coleções",
    icon: <FolderOpen className="h-4 w-4" />,
    href: "/colecoes",
  },
  {
    id: "favorites",
    title: "Favoritos",
    description: "Ver produtos favoritos",
    icon: <Heart className="h-4 w-4" />,
    href: "/favoritos",
  },
  {
    id: "simulator",
    title: "Simulador de Personalização",
    description: "Calcular custos de personalização",
    icon: <Calculator className="h-4 w-4" />,
    href: "/simulador",
  },
  {
    id: "mockup",
    title: "Gerador de Mockups",
    description: "Criar mockups com logo",
    icon: <Wand2 className="h-4 w-4" />,
    href: "/mockup",
  },
  {
    id: "bi",
    title: "Dashboard BI",
    description: "Análises e métricas",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/bi",
  },
  {
    id: "trends",
    title: "Tendências",
    description: "Análise de tendências",
    icon: <TrendingUp className="h-4 w-4" />,
    href: "/tendencias",
  },
];

const typeConfig = {
  product: { label: "Produto", color: "bg-blue-500", icon: Package },
  client: { label: "Cliente", color: "bg-green-500", icon: Users },
  quote: { label: "Orçamento", color: "bg-orange-500", icon: FileText },
  order: { label: "Pedido", color: "bg-purple-500", icon: ShoppingCart },
};

interface SearchIntent {
  type: 'product' | 'client' | 'quote' | 'order' | 'mixed';
  filters: {
    category?: string;
    color?: string;
    material?: string;
    priceRange?: 'low' | 'medium' | 'high';
    status?: string;
    clientName?: string;
    dateRange?: 'today' | 'week' | 'month' | 'year';
  };
  keywords: string[];
  originalQuery: string;
}

interface PopularProduct {
  id: string;
  name: string;
  sku: string;
  category_name: string | null;
  view_count: number;
}

interface AppliedFilter {
  type: "category" | "color" | "price" | "material" | "stock" | "featured" | "kit";
  label: string;
}

export function GlobalSearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [searchIntent, setSearchIntent] = useState<SearchIntent | null>(null);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [typingSuggestions, setTypingSuggestions] = useState<string[]>([]);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [voiceCommandAction, setVoiceCommandAction] = useState<string | null>(null);
  const [voiceAppliedFilters, setVoiceAppliedFilters] = useState<AppliedFilter[]>([]);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 500);
  const { history, addToHistory, removeFromHistory, quickSuggestions } = useSearch();
  
  // Voice command history
  const {
    frequentCommands,
    recentCommands,
    addCommand: addVoiceCommand,
    getSuggestions: getVoiceCommandSuggestions,
  } = useVoiceCommandHistory();

  // Contextual suggestions based on current page and filters
  const { suggestions: contextualSuggestions, routeContext } = useContextualSuggestions({
    searchQuery: query,
  });

  // Voice feedback sounds
  const {
    playStartListening,
    playStopListening,
    playCommandRecognized,
    playCommandSuccess,
    playError,
    playNavigation,
    playFilterApplied,
  } = useVoiceFeedback();

  // Determine command type from transcript
  const detectCommandType = useCallback((text: string): 'filter' | 'search' | 'navigation' | 'sort' | 'clear' => {
    const lower = text.toLowerCase();
    if (/^(limpar|resetar|remover filtros)/.test(lower)) return 'clear';
    if (/^(ir para|abrir|navegar|mostrar pagina)/.test(lower)) return 'navigation';
    if (/(ordenar|ordem|mais barato|mais caro)/.test(lower)) return 'sort';
    if (/(filtrar|buscar|mostrar|encontrar|quero)/.test(lower)) return 'filter';
    return 'search';
  }, []);

  // Voice search integration
  const handleVoiceResult = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    const commandType = detectCommandType(transcript);
    
    // Play command recognized sound
    playCommandRecognized();
    
    // Parse voice commands
    const appliedFilters: AppliedFilter[] = [];
    
    // Category detection
    const categoryMatches = lowerTranscript.match(/(?:canetas?|mochilas?|garrafas?|canecas?|camisetas?|bolsas?|cadernos?|agendas?|kits?|ecobags?)/gi);
    if (categoryMatches) {
      appliedFilters.push({ type: "category", label: categoryMatches[0] });
    }
    
    // Color detection
    const colorMatches = lowerTranscript.match(/(?:azul|azuis|vermelho|vermelhas?|verde|verdes?|amarelo|amarelas?|preto|pretas?|branco|brancas?|rosa|roxo|laranja)/gi);
    if (colorMatches) {
      appliedFilters.push({ type: "color", label: colorMatches[0] });
    }
    
    // Price detection
    const priceMatch = lowerTranscript.match(/(?:até|menos de|abaixo de|barato|baratas?)\s*(?:r?\$?\s*)?(\d+)/i);
    if (priceMatch) {
      appliedFilters.push({ type: "price", label: `Até R$ ${priceMatch[1]}` });
    } else if (/barato|baratas?|econômico/i.test(lowerTranscript)) {
      appliedFilters.push({ type: "price", label: "Preço baixo" });
    } else if (/premium|caro|luxo/i.test(lowerTranscript)) {
      appliedFilters.push({ type: "price", label: "Premium" });
    }
    
    // Material detection
    const materialMatches = lowerTranscript.match(/(?:ecológico|ecológicas?|bambu|reciclado|sustentável|metal|plástico|algodão)/gi);
    if (materialMatches) {
      appliedFilters.push({ type: "material", label: materialMatches[0] });
    }
    
    // Stock detection
    if (/em estoque|disponível|pronta entrega/i.test(lowerTranscript)) {
      appliedFilters.push({ type: "stock", label: "Em estoque" });
    }
    
    // Kit detection
    if (/kits?(?:\s|$)/i.test(lowerTranscript)) {
      appliedFilters.push({ type: "kit", label: "Kit" });
    }
    
    setVoiceAppliedFilters(appliedFilters);
    
    // Play filter sound if filters detected
    if (appliedFilters.length > 0) {
      playFilterApplied();
    }
    
    // Check for navigation commands
    if (/(?:ir para|abrir|mostrar|ver)\s*(?:orçamentos?|cotações?)/i.test(lowerTranscript)) {
      addVoiceCommand(transcript, 'navigation', true);
      setVoiceCommandAction("Abrindo orçamentos...");
      playNavigation();
      setTimeout(() => {
        setVoiceOverlayOpen(false);
        navigate("/orcamentos");
      }, 1000);
      return;
    }
    
    if (/(?:ir para|abrir|mostrar|ver)\s*(?:pedidos?|orders?)/i.test(lowerTranscript)) {
      addVoiceCommand(transcript, 'navigation', true);
      setVoiceCommandAction("Abrindo pedidos...");
      playNavigation();
      setTimeout(() => {
        setVoiceOverlayOpen(false);
        navigate("/pedidos");
      }, 1000);
      return;
    }
    
    
    if (/(?:ir para|abrir|mostrar|ver)\s*(?:favoritos?)/i.test(lowerTranscript)) {
      addVoiceCommand(transcript, 'navigation', true);
      setVoiceCommandAction("Abrindo favoritos...");
      playNavigation();
      setTimeout(() => {
        setVoiceOverlayOpen(false);
        navigate("/favoritos");
      }, 1000);
      return;
    }
    
    if (/(?:novo|criar|fazer)\s*(?:orçamento|cotação)/i.test(lowerTranscript)) {
      addVoiceCommand(transcript, 'navigation', true);
      setVoiceCommandAction("Criando novo orçamento...");
      playNavigation();
      setTimeout(() => {
        setVoiceOverlayOpen(false);
        navigate("/orcamentos/novo");
      }, 1000);
      return;
    }
    
    // Search command - close overlay and perform search
    if (appliedFilters.length > 0 || transcript.length > 3) {
      addVoiceCommand(transcript, commandType, true);
      setVoiceCommandAction(`Buscando: "${transcript}"`);
      playCommandSuccess();
      setTimeout(() => {
        setVoiceOverlayOpen(false);
        setQuery(transcript);
        setOpen(true);
      }, 1500);
    }
  }, [navigate, addVoiceCommand, detectCommandType, playCommandRecognized, playNavigation, playFilterApplied, playCommandSuccess]);

  // Handle voice errors
  const handleVoiceError = useCallback((errorMessage: string) => {
    playError();
  }, [playError]);
  
  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript: voiceTranscript,
    startListening,
    stopListening,
    error: voiceError,
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    onError: handleVoiceError,
    language: "pt-BR",
  });
  
  const toggleVoiceSearch = useCallback(() => {
    if (isListening) {
      playStopListening();
      stopListening();
    } else {
      setVoiceCommandAction(null);
      setVoiceAppliedFilters([]);
      playStartListening();
      startListening();
    }
  }, [isListening, startListening, stopListening, playStartListening, playStopListening]);
  
  const handleOpenVoiceOverlay = useCallback(() => {
    setVoiceOverlayOpen(true);
    setVoiceCommandAction(null);
    setVoiceAppliedFilters([]);
  }, []);
  
  const handleCloseVoiceOverlay = useCallback(() => {
    setVoiceOverlayOpen(false);
    if (isListening) {
      playStopListening();
      stopListening();
    }
  }, [isListening, stopListening, playStopListening]);

  // Fetch popular products based on views
  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        // Get products with most views
        const { data: viewsData } = await supabase
          .from("product_views")
          .select("product_id, product_name, product_sku")
          .order("created_at", { ascending: false })
          .limit(100);

        if (viewsData) {
          // Count views per product
          const viewCounts = viewsData.reduce((acc: Record<string, { count: number; name: string; sku: string }>, view) => {
            if (view.product_id) {
              if (!acc[view.product_id]) {
                acc[view.product_id] = { count: 0, name: view.product_name, sku: view.product_sku || "" };
              }
              acc[view.product_id].count++;
            }
            return acc;
          }, {});

          // Sort by view count and take top 5
          const popular = Object.entries(viewCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5)
            .map(([id, data]) => ({
              id,
              name: data.name,
              sku: data.sku,
              category_name: null,
              view_count: data.count,
            }));

          setPopularProducts(popular);
        }
      } catch (error) {
        console.error("Error fetching popular products:", error);
      }
    };

    if (open) {
      fetchPopularProducts();
    }
  }, [open]);

  // Generate typing suggestions based on current query
  useEffect(() => {
    if (query.length >= 2 && query.length < 5) {
      const lowerQuery = query.toLowerCase();
      const suggestions: string[] = [];

      // Add from history that starts with query
      history.forEach((h) => {
        if (h.toLowerCase().startsWith(lowerQuery) && !suggestions.includes(h)) {
          suggestions.push(h);
        }
      });

      // Add from quick suggestions that match
      quickSuggestions.forEach((qs) => {
        if (qs.label.toLowerCase().includes(lowerQuery) && !suggestions.includes(qs.label)) {
          suggestions.push(qs.label);
        }
      });

      setTypingSuggestions(suggestions.slice(0, 5));
    } else {
      setTypingSuggestions([]);
    }
  }, [query, history, quickSuggestions]);

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // AI-powered semantic search
  const performSemanticSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setResults([]);
      setSearchIntent(null);
      return;
    }

    setIsSearching(true);
    setIsAIProcessing(true);

    try {
      // First, get AI interpretation of the query
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('semantic-search', {
        body: { query: searchQuery }
      });

      setIsAIProcessing(false);

      let intent: SearchIntent = {
        type: 'mixed',
        filters: {},
        keywords: searchQuery.split(' ').filter(w => w.length > 2),
        originalQuery: searchQuery
      };

      if (aiResponse?.success && aiResponse?.intent) {
        intent = aiResponse.intent;
        setSearchIntent(intent);
      }

      const allResults: SearchResult[] = [];

      // Search based on intent
      if (intent.type === 'product' || intent.type === 'mixed') {
        try {
          const { fetchPromobrindProducts } = await import('@/lib/external-db');
            const productQuery = intent.keywords.join(' ') || searchQuery;
          const productsData = await fetchPromobrindProducts({ 
              search: productQuery,
            limit: 30 
          });

          let filteredProducts = productsData;

          // Apply filters
          if (intent.filters.category) {
            const catFilter = intent.filters.category.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
              p.category_name?.toLowerCase().includes(catFilter)
            );
          }
          
          if (intent.filters.priceRange) {
            if (intent.filters.priceRange === 'low') {
              filteredProducts = filteredProducts.filter(p => ((p as ExternalProduct).sale_price || (p as ExternalProduct).base_price || 0) < 50);
            } else if (intent.filters.priceRange === 'high') {
              filteredProducts = filteredProducts.filter(p => ((p as ExternalProduct).sale_price || (p as ExternalProduct).base_price || 0) > 200);
            }
          }

          // Filter by color if specified
          if (intent.filters.color) {
            const colorLower = intent.filters.color.toLowerCase();
            filteredProducts = filteredProducts.filter(p => {
              if (!p.colors) return false;
              const colors = Array.isArray(p.colors) ? p.colors : [];
              return colors.some((c: any) => 
                c.name?.toLowerCase().includes(colorLower) || 
                c.label?.toLowerCase().includes(colorLower)
              );
            });
            // If no color matches, show all products
            if (filteredProducts.length === 0) filteredProducts = productsData.slice(0, 8);
          }

          const fuse = new Fuse(filteredProducts, createProductFuseOptions<ExternalProduct>());
          const orderedProducts = rankProductSearchResults(filteredProducts, productQuery, fuse, { limit: 8 });

          orderedProducts.forEach((p) => {
            allResults.push({
              id: p.id,
              title: p.name,
              subtitle: `SKU: ${p.sku} • ${p.category_name || "Sem categoria"} • ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((p as ExternalProduct).sale_price || (p as ExternalProduct).base_price || 0)}`,
              type: "product",
              href: `/produto/${p.id}`,
            });
          });
        } catch (error) {
          console.error("Error searching products:", error);
        }
      }

      if (intent.type === 'client' || intent.type === 'mixed') {
        try {
          const { searchCrm } = await import("@/lib/crm-db");
          const { getCompanyDisplayName } = await import("@/types/crm");
          
          const searchTerm = intent.filters.clientName || intent.keywords.join(' ');
          if (searchTerm) {
            const companies = await searchCrm<any>("companies", "razao_social", searchTerm, {
              select: "id, razao_social, nome_fantasia, ramo",
              limit: 5,
            });

            companies.forEach((c: any) => {
              allResults.push({
                id: c.id,
                title: c.nome_fantasia || c.razao_social,
                subtitle: c.ramo || "Empresa",
                type: "client",
                href: `/cliente/${c.id}`,
              });
            });
          }
        } catch (error) {
          console.error("Error searching clients in CRM:", error);
        }
      }

      if (intent.type === 'quote' || intent.type === 'mixed') {
        try {
          const { selectCrm } = await import("@/lib/crm-db");
          const filters: Record<string, unknown> = {};
          if (intent.filters.status) {
            filters.status = intent.filters.status;
          }

          const quotes = await selectCrm<any>("quotes", {
            filters,
            orderBy: { column: "created_at", ascending: false },
            limit: 5,
          });

          let filteredQuotes = quotes || [];
          if (intent.filters.clientName) {
            const clientNameLower = intent.filters.clientName.toLowerCase();
            filteredQuotes = filteredQuotes.filter((q: any) => 
              q.client_name?.toLowerCase().includes(clientNameLower)
            );
          }

          filteredQuotes.forEach((q: any) => {
            allResults.push({
              id: q.id,
              title: q.quote_number,
              subtitle: `${q.client_name || "Sem cliente"} • ${q.status} • ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(q.total || 0)}`,
              type: "quote",
              href: `/orcamentos/${q.id}`,
            });
          });
        } catch (err) {
          console.error("Error searching quotes in CRM:", err);
        }
      }

      if (intent.type === 'order' || intent.type === 'mixed') {
        let orderQuery = supabase.from("orders")
          .select("id, order_number, status, total, client:bitrix_clients(name)");

        if (intent.filters.status) {
          orderQuery = orderQuery.eq("status", intent.filters.status);
        }

        const { data: orders } = await orderQuery.limit(5);

        if (orders) {
          let filteredOrders = orders;
          if (intent.filters.clientName) {
            const clientNameLower = intent.filters.clientName.toLowerCase();
            filteredOrders = orders.filter((o: any) => 
              o.client?.name?.toLowerCase().includes(clientNameLower)
            );
          }

          filteredOrders.forEach((o: any) => {
            allResults.push({
              id: o.id,
              title: o.order_number,
              subtitle: `${o.client?.name || "Sem cliente"} • ${o.status} • ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(o.total || 0)}`,
              type: "order",
              href: `/pedidos/${o.id}`,
            });
          });
        }
      }

      setResults(allResults);
    } catch (error) {
      console.error("Search error:", error);
      setIsAIProcessing(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Trigger search when debounced query changes
  useEffect(() => {
    performSemanticSearch(debouncedQuery);
  }, [debouncedQuery, performSemanticSearch]);

  const handleSelect = (href: string, saveToHistory = true) => {
    if (saveToHistory && query.trim()) {
      addToHistory(query.trim());
    }
    setOpen(false);
    setQuery("");
    setResults([]);
    setSearchIntent(null);
    setTypingSuggestions([]);
    navigate(href);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const handleRemoveFromHistory = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeFromHistory(term);
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      {/* Search trigger button with voice */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors flex-1 md:w-56"
        >
          <Brain className="h-4 w-4 text-primary" />
          <span className="flex-1 text-left">Busca inteligente...</span>
          <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
        
        {/* Voice search button */}
        {isVoiceSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenVoiceOverlay}
                className="shrink-0 h-10 w-10 rounded-lg border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card border-border">Fala comigo Bebê!</TooltipContent>
          </Tooltip>
        )}
      </div>
      
      {/* Voice search overlay */}
      <VoiceSearchOverlay
        isOpen={voiceOverlayOpen}
        isListening={isListening}
        transcript={voiceTranscript}
        error={voiceError}
        onClose={handleCloseVoiceOverlay}
        onToggleListening={toggleVoiceSearch}
        commandAction={voiceCommandAction}
        appliedFilters={voiceAppliedFilters}
        frequentCommands={frequentCommands}
        recentCommands={recentCommands}
        onCommandSelect={(command) => {
          handleVoiceResult(command);
        }}
      />

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Ex: canecas azuis baratas, orçamentos pendentes do João..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[500px]">
          {/* AI Processing indicator */}
          {isAIProcessing && (
            <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm text-primary">Analisando sua busca com IA...</span>
            </div>
          )}

          {/* Show interpreted intent */}
          {searchIntent && !isSearching && results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-muted/50 border-b">
              <Brain className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">Entendi:</span>
              {searchIntent.type !== 'mixed' && (
                <Badge variant="outline" className="text-xs">
                  {searchIntent.type === 'product' && 'Produtos'}
                  {searchIntent.type === 'client' && 'Clientes'}
                  {searchIntent.type === 'quote' && 'Orçamentos'}
                  {searchIntent.type === 'order' && 'Pedidos'}
                </Badge>
              )}
              {searchIntent.filters.category && (
                <Badge variant="secondary" className="text-xs">
                  {searchIntent.filters.category}
                </Badge>
              )}
              {searchIntent.filters.color && (
                <Badge variant="secondary" className="text-xs">
                  Cor: {searchIntent.filters.color}
                </Badge>
              )}
              {searchIntent.filters.priceRange && (
                <Badge variant="secondary" className="text-xs">
                  {searchIntent.filters.priceRange === 'low' && 'Preço baixo'}
                  {searchIntent.filters.priceRange === 'medium' && 'Preço médio'}
                  {searchIntent.filters.priceRange === 'high' && 'Premium'}
                </Badge>
              )}
              {searchIntent.filters.status && (
                <Badge variant="secondary" className="text-xs">
                  Status: {searchIntent.filters.status}
                </Badge>
              )}
              {searchIntent.filters.clientName && (
                <Badge variant="secondary" className="text-xs">
                  Cliente: {searchIntent.filters.clientName}
                </Badge>
              )}
            </div>
          )}

          {isSearching && !isAIProcessing && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isSearching && query.length >= 3 && results.length === 0 && (
            <CommandEmpty>
              Nenhum resultado encontrado para "{query}"
            </CommandEmpty>
          )}

          {/* Search results */}
          {!isSearching && Object.entries(groupedResults).map(([type, items]) => {
            const config = typeConfig[type as keyof typeof typeConfig];
            const Icon = config.icon;
            
            return (
              <CommandGroup key={type} heading={config.label + "s"}>
                {items.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.href)}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className={`p-2 rounded-lg ${config.color}/10`}>
                      <Icon className={`h-4 w-4 ${config.color.replace("bg-", "text-")}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {config.label}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {/* Typing suggestions */}
          {typingSuggestions.length > 0 && query.length >= 2 && query.length < 5 && !isSearching && (
            <CommandGroup heading="Sugestões">
              {typingSuggestions.map((suggestion, index) => (
                <CommandItem
                  key={`suggestion-${index}`}
                  value={`suggestion-${suggestion}`}
                  onSelect={() => handleSuggestionClick(suggestion)}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="flex-1">{suggestion}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick actions when no search query */}
          {query.length < 2 && (
            <>
              {/* Recent searches from history */}
              {history.length > 0 && (
                <CommandGroup heading="Buscas Recentes">
                  {history.slice(0, 5).map((term, index) => (
                    <CommandItem
                      key={`history-${index}`}
                      value={`history-${term}`}
                      onSelect={() => handleSuggestionClick(term)}
                      className="flex items-center gap-3 py-2 group"
                    >
                      <div className="p-2 rounded-lg bg-muted">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="flex-1">{term}</span>
                      <button
                        onClick={(e) => handleRemoveFromHistory(e, term)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Popular products */}
              {popularProducts.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Produtos Populares">
                    {popularProducts.map((product) => (
                      <CommandItem
                        key={`popular-${product.id}`}
                        value={`popular-${product.name}`}
                        onSelect={() => handleSelect(`/produto/${product.id}`, false)}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <Flame className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.sku} • {product.view_count} visualizações
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Popular
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Contextual suggestions based on current page */}
              {contextualSuggestions.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={`Sugestões para ${routeContext.section === 'products' ? 'Catálogo' : routeContext.section === 'quotes' ? 'Orçamentos' : routeContext.section === 'orders' ? 'Pedidos' : routeContext.section === 'clients' ? 'Clientes' : 'Esta Página'}`}>
                    <div className="flex flex-wrap gap-2 p-2">
                      {contextualSuggestions.slice(0, 6).map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => handleSuggestionClick(suggestion.text)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors",
                            suggestion.type === 'filter' && "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30",
                            suggestion.type === 'navigation' && "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30",
                            suggestion.type === 'action' && "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30",
                            suggestion.type === 'search' && "bg-muted hover:bg-muted/80"
                          )}
                        >
                          <span>{suggestion.icon}</span>
                          <span>{suggestion.text}</span>
                        </button>
                      ))}
                    </div>
                  </CommandGroup>
                </>
              )}

              {/* Quick suggestions */}
              <CommandSeparator />
              <CommandGroup heading="Sugestões Rápidas">
                <div className="flex flex-wrap gap-2 p-2">
                  {quickSuggestions.map((qs, index) => (
                    <button
                      key={`quick-${index}`}
                      onClick={() => handleSuggestionClick(qs.label)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors"
                    >
                      <span>{qs.icon}</span>
                      <span>{qs.label}</span>
                    </button>
                  ))}
                </div>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Ações Rápidas">
                {quickActions.slice(0, 5).map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.title}
                    onSelect={() => handleSelect(action.href, false)}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    {action.shortcut && (
                      <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        {action.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Navegação">
                {quickActions.slice(5).map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.title}
                    onSelect={() => handleSelect(action.href, false)}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
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
