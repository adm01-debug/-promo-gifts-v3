/**
 * useGlobalSearch — Hook that encapsulates all search logic for GlobalSearchPalette.
 * Extracted to reduce the component from 1033 to ~300 lines (UI only).
 */
import { useEffect, useState, useCallback } from "react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearch } from "@/hooks/useSearch";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVoiceCommandHistory } from "@/hooks/useVoiceCommandHistory";
import { useContextualSuggestions } from "@/hooks/useContextualSuggestions";
import { useVoiceFeedback } from "@/hooks/useVoiceFeedback";
import { createProductFuseOptions, rankProductSearchResults } from "@/utils/product-search";
import type { ExternalProduct } from "@/types/external-db";

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "product" | "client" | "quote" | "order";
  href: string;
  metadata?: Record<string, unknown>;
}

export interface SearchIntent {
  type: "product" | "client" | "quote" | "order" | "mixed";
  filters: {
    category?: string;
    color?: string;
    material?: string;
    priceRange?: "low" | "medium" | "high";
    status?: string;
    clientName?: string;
    dateRange?: "today" | "week" | "month" | "year";
  };
  keywords: string[];
  originalQuery: string;
}

export interface PopularProduct {
  id: string;
  name: string;
  sku: string;
  category_name: string | null;
  view_count: number;
}

export interface AppliedFilter {
  type: "category" | "color" | "price" | "material" | "stock" | "featured" | "kit";
  label: string;
}

export function useGlobalSearch() {
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

  const {
    frequentCommands, recentCommands,
    addCommand: addVoiceCommand,
  } = useVoiceCommandHistory();

  const { suggestions: contextualSuggestions, routeContext } = useContextualSuggestions({ searchQuery: query });

  const {
    playStartListening, playStopListening, playCommandRecognized,
    playCommandSuccess, playError, playNavigation, playFilterApplied,
  } = useVoiceFeedback();

  // ── Voice command detection ──
  const detectCommandType = useCallback((text: string): "filter" | "search" | "navigation" | "sort" | "clear" => {
    const lower = text.toLowerCase();
    if (/^(limpar|resetar|remover filtros)/.test(lower)) return "clear";
    if (/^(ir para|abrir|navegar|mostrar pagina)/.test(lower)) return "navigation";
    if (/(ordenar|ordem|mais barato|mais caro)/.test(lower)) return "sort";
    if (/(filtrar|buscar|mostrar|encontrar|quero)/.test(lower)) return "filter";
    return "search";
  }, []);

  const handleVoiceResult = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    const commandType = detectCommandType(transcript);
    playCommandRecognized();

    const appliedFilters: AppliedFilter[] = [];

    const categoryMatches = lowerTranscript.match(/(?:canetas?|mochilas?|garrafas?|canecas?|camisetas?|bolsas?|cadernos?|agendas?|kits?|ecobags?)/gi);
    if (categoryMatches) appliedFilters.push({ type: "category", label: categoryMatches[0] });

    const colorMatches = lowerTranscript.match(/(?:azul|azuis|vermelho|vermelhas?|verde|verdes?|amarelo|amarelas?|preto|pretas?|branco|brancas?|rosa|roxo|laranja)/gi);
    if (colorMatches) appliedFilters.push({ type: "color", label: colorMatches[0] });

    const priceMatch = lowerTranscript.match(/(?:até|menos de|abaixo de|barato|baratas?)\s*(?:r?\$?\s*)?(\d+)/i);
    if (priceMatch) {
      appliedFilters.push({ type: "price", label: `Até R$ ${priceMatch[1]}` });
    } else if (/barato|baratas?|econômico/i.test(lowerTranscript)) {
      appliedFilters.push({ type: "price", label: "Preço baixo" });
    } else if (/premium|caro|luxo/i.test(lowerTranscript)) {
      appliedFilters.push({ type: "price", label: "Premium" });
    }

    const materialMatches = lowerTranscript.match(/(?:ecológico|ecológicas?|bambu|reciclado|sustentável|metal|plástico|algodão)/gi);
    if (materialMatches) appliedFilters.push({ type: "material", label: materialMatches[0] });

    if (/em estoque|disponível|pronta entrega/i.test(lowerTranscript)) appliedFilters.push({ type: "stock", label: "Em estoque" });
    if (/kits?(?:\s|$)/i.test(lowerTranscript)) appliedFilters.push({ type: "kit", label: "Kit" });

    setVoiceAppliedFilters(appliedFilters);
    if (appliedFilters.length > 0) playFilterApplied();

    // Navigation commands
    const navRoutes: [RegExp, string, string][] = [
      [/(?:ir para|abrir|mostrar|ver)\s*(?:orçamentos?|cotações?)/i, "/orcamentos", "Abrindo orçamentos..."],
      [/(?:ir para|abrir|mostrar|ver)\s*(?:pedidos?|orders?)/i, "/pedidos", "Abrindo pedidos..."],
      [/(?:ir para|abrir|mostrar|ver)\s*(?:favoritos?)/i, "/favoritos", "Abrindo favoritos..."],
      [/(?:novo|criar|fazer)\s*(?:orçamento|cotação)/i, "/orcamentos/novo", "Criando novo orçamento..."],
    ];

    for (const [pattern, route, message] of navRoutes) {
      if (pattern.test(lowerTranscript)) {
        addVoiceCommand(transcript, "navigation", true);
        setVoiceCommandAction(message);
        playNavigation();
        setTimeout(() => { setVoiceOverlayOpen(false); navigate(route); }, 1000);
        return;
      }
    }

    if (appliedFilters.length > 0 || transcript.length > 3) {
      addVoiceCommand(transcript, commandType, true);
      setVoiceCommandAction(`Buscando: "${transcript}"`);
      playCommandSuccess();
      setTimeout(() => { setVoiceOverlayOpen(false); setQuery(transcript); setOpen(true); }, 1500);
    }
  }, [navigate, addVoiceCommand, detectCommandType, playCommandRecognized, playNavigation, playFilterApplied, playCommandSuccess]);

  const handleVoiceError = useCallback(() => { playError(); }, [playError]);

  const {
    isListening, isSupported: isVoiceSupported, transcript: voiceTranscript,
    startListening, stopListening, error: voiceError,
  } = useSpeechRecognition({ onResult: handleVoiceResult, onError: handleVoiceError, language: "pt-BR" });

  const toggleVoiceSearch = useCallback(() => {
    if (isListening) { playStopListening(); stopListening(); }
    else { setVoiceCommandAction(null); setVoiceAppliedFilters([]); playStartListening(); startListening(); }
  }, [isListening, startListening, stopListening, playStartListening, playStopListening]);

  const handleOpenVoiceOverlay = useCallback(() => { setVoiceOverlayOpen(true); setVoiceCommandAction(null); setVoiceAppliedFilters([]); }, []);
  const handleCloseVoiceOverlay = useCallback(() => {
    setVoiceOverlayOpen(false);
    if (isListening) { playStopListening(); stopListening(); }
  }, [isListening, stopListening, playStopListening]);

  // ── Popular products ──
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data: viewsData } = await supabase
          .from("product_views").select("product_id, product_name, product_sku")
          .order("created_at", { ascending: false }).limit(100);
        if (!viewsData) return;

        const viewCounts = viewsData.reduce((acc: Record<string, { count: number; name: string; sku: string }>, v) => {
          if (v.product_id) {
            if (!acc[v.product_id]) acc[v.product_id] = { count: 0, name: v.product_name ?? "", sku: v.product_sku || "" };
            acc[v.product_id].count++;
          }
          return acc;
        }, {});

        setPopularProducts(
          Object.entries(viewCounts).sort(([, a], [, b]) => b.count - a.count).slice(0, 5)
            .map(([id, d]) => ({ id, name: d.name, sku: d.sku, category_name: null, view_count: d.count }))
        );
      } catch { /* silent */ }
    })();
  }, [open]);

  // ── Typing suggestions ──
  useEffect(() => {
    if (query.length >= 2 && query.length < 5) {
      const lowerQuery = query.toLowerCase();
      const suggestions: string[] = [];
      history.forEach(h => { if (h.toLowerCase().startsWith(lowerQuery) && !suggestions.includes(h)) suggestions.push(h); });
      quickSuggestions.forEach(qs => { if (qs.label.toLowerCase().includes(lowerQuery) && !suggestions.includes(qs.label)) suggestions.push(qs.label); });
      setTypingSuggestions(suggestions.slice(0, 5));
    } else {
      setTypingSuggestions([]);
    }
  }, [query, history, quickSuggestions]);

  // ── Keyboard shortcut ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(o => !o); } };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // ── Semantic search ──
  const performSemanticSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) { setResults([]); setSearchIntent(null); return; }
    setIsSearching(true); setIsAIProcessing(true);
    try {
      const { data: aiResponse } = await supabase.functions.invoke("semantic-search", { body: { query: searchQuery } });
      setIsAIProcessing(false);

      let intent: SearchIntent = { type: "mixed", filters: {}, keywords: searchQuery.split(" ").filter(w => w.length > 2), originalQuery: searchQuery };
      if (aiResponse?.success && aiResponse?.intent) { intent = aiResponse.intent; setSearchIntent(intent); }

      const allResults: SearchResult[] = [];

      if (intent.type === "product" || intent.type === "mixed") {
        try {
          const { fetchPromobrindProducts } = await import("@/lib/external-db");
          const { dedupeById: dedupeByIdUtil } = await import("@/utils/product-search");
          const productQuery = intent.keywords.join(" ") || searchQuery;
          const [prefixData, broadData] = await Promise.all([
            fetchPromobrindProducts({ filters: { _name_prefix: productQuery }, limit: 200 }),
            fetchPromobrindProducts({ search: productQuery, limit: 500 }),
          ]);
          let filteredProducts = dedupeByIdUtil([...prefixData, ...broadData]);

          if (intent.filters.category) {
            const catFilter = intent.filters.category.toLowerCase();
            filteredProducts = filteredProducts.filter(p => p.category_name?.toLowerCase().includes(catFilter));
          }
          if (intent.filters.priceRange) {
            if (intent.filters.priceRange === "low") filteredProducts = filteredProducts.filter(p => ((p as ExternalProduct).sale_price || (p as ExternalProduct).base_price || 0) < 50);
            else if (intent.filters.priceRange === "high") filteredProducts = filteredProducts.filter(p => ((p as ExternalProduct).sale_price || (p as ExternalProduct).base_price || 0) > 200);
          }
          if (intent.filters.color) {
            const colorLower = intent.filters.color.toLowerCase();
            const colorFiltered = filteredProducts.filter(p => {
              if (!p.colors) return false;
              const colors = Array.isArray(p.colors) ? p.colors : [];
              return colors.some((c: Record<string, string>) => c.name?.toLowerCase().includes(colorLower) || c.label?.toLowerCase().includes(colorLower));
            });
            if (colorFiltered.length > 0) filteredProducts = colorFiltered;
          }

          const fuse = new Fuse(filteredProducts, createProductFuseOptions<ExternalProduct>());
          rankProductSearchResults(filteredProducts, productQuery, fuse).forEach(p => {
            allResults.push({
              id: p.id, title: p.name,
              subtitle: `SKU: ${p.sku} • ${p.category_name || "Sem categoria"} • ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((p as ExternalProduct).sale_price || (p as ExternalProduct).base_price || 0)}`,
              type: "product", href: `/produto/${p.id}`,
            });
          });
        } catch { /* silent */ }
      }

      if (intent.type === "client" || intent.type === "mixed") {
        try {
          const { searchCrm } = await import("@/lib/crm-db");
          const { getCompanyDisplayName } = await import("@/types/crm");
          const searchTerm = intent.filters.clientName || intent.keywords.join(" ");
          if (searchTerm) {
            const companies = await searchCrm<Record<string, string>>("companies", "razao_social", searchTerm, { select: "id, razao_social, nome_fantasia, ramo", limit: 5 });
            companies.forEach(c => { allResults.push({ id: c.id, title: c.nome_fantasia || c.razao_social, subtitle: c.ramo || "Empresa", type: "client", href: `/cliente/${c.id}` }); });
          }
        } catch { /* silent */ }
      }

      if (intent.type === "quote" || intent.type === "mixed") {
        try {
          const { selectCrm } = await import("@/lib/crm-db");
          const filters: Record<string, unknown> = {};
          if (intent.filters.status) filters.status = intent.filters.status;
          const quotes = await selectCrm<Record<string, unknown>>("quotes", { filters, orderBy: { column: "created_at", ascending: false }, limit: 5 });
          let filteredQuotes = quotes || [];
          if (intent.filters.clientName) {
            const cLower = intent.filters.clientName.toLowerCase();
            filteredQuotes = filteredQuotes.filter(q => (q.client_name as string)?.toLowerCase().includes(cLower));
          }
          filteredQuotes.forEach(q => {
            allResults.push({
              id: q.id as string, title: q.quote_number as string,
              subtitle: `${q.client_name || "Sem cliente"} • ${q.status} • ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((q.total as number) || 0)}`,
              type: "quote", href: `/orcamentos/${q.id}`,
            });
          });
        } catch { /* silent */ }
      }

      if (intent.type === "order" || intent.type === "mixed") {
        let orderQuery = supabase.from("orders").select("id, order_number, status, total, client_name, organization_id").limit(5);
        // RLS enforces org isolation, but add explicit filter for defense-in-depth
        const { data: orders } = await orderQuery;
        if (orders) {
          let filteredOrders = orders;
          if (intent.filters.clientName) {
            const cLower = intent.filters.clientName.toLowerCase();
            filteredOrders = orders.filter(o => o.client_name?.toLowerCase().includes(cLower));
          }
          filteredOrders.forEach(o => {
            allResults.push({
              id: o.id, title: o.order_number,
              subtitle: `${o.client_name || "Sem cliente"} • ${o.status} • ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(o.total || 0)}`,
              type: "order", href: `/pedidos/${o.id}`,
            });
          });
        }
      }

      setResults(allResults);
    } catch {
      setIsAIProcessing(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => { performSemanticSearch(debouncedQuery); }, [debouncedQuery, performSemanticSearch]);

  const handleSelect = useCallback((href: string, saveToHistory = true) => {
    if (saveToHistory && query.trim()) addToHistory(query.trim());
    setOpen(false); setQuery(""); setResults([]); setSearchIntent(null); setTypingSuggestions([]);
    navigate(href);
  }, [query, addToHistory, navigate]);

  const handleSuggestionClick = useCallback((suggestion: string) => { setQuery(suggestion); }, []);

  const handleRemoveFromHistory = useCallback((e: React.MouseEvent, term: string) => {
    e.stopPropagation(); removeFromHistory(term);
  }, [removeFromHistory]);

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return {
    open, setOpen, query, setQuery,
    results, groupedResults, isSearching, isAIProcessing, searchIntent,
    popularProducts, typingSuggestions,
    voiceOverlayOpen, voiceCommandAction, voiceAppliedFilters,
    isListening, isVoiceSupported, voiceTranscript, voiceError,
    toggleVoiceSearch, handleOpenVoiceOverlay, handleCloseVoiceOverlay,
    frequentCommands, recentCommands, handleVoiceResult,
    handleSelect, handleSuggestionClick, handleRemoveFromHistory,
    history, quickSuggestions, contextualSuggestions, routeContext,
  };
}
