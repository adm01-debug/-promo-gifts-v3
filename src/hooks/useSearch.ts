import { useState, useEffect, useMemo, useCallback } from "react";
import Fuse from "fuse.js";
import { Product } from "@/hooks/useProducts";
import { CATEGORIES, SUPPLIERS } from "@/data/mockData";

const HISTORY_KEY = "search-history";
const MAX_HISTORY = 10;

// This hook now relies on ProductsContext for product data
// Products are passed externally or fetched via context

export interface SearchResult {
  type: "product" | "category" | "supplier" | "history";
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  data?: Product;
}

export function useSearch(products: Product[] = []) {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading search history:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }, [history, isLoaded]);

  const addToHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== term.toLowerCase());
      return [term, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const removeFromHistory = useCallback((term: string) => {
    setHistory((prev) => prev.filter((h) => h !== term));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Criar instância Fuse.js para busca fuzzy de produtos
  const productFuse = useMemo(() => new Fuse(products, {
    keys: [
      { name: 'sku', weight: 0.35 },
      { name: 'name', weight: 0.30 },
      { name: 'brand', weight: 0.15 },
      { name: 'category_name', weight: 0.10 },
      { name: 'description', weight: 0.10 },
    ],
    threshold: 0.35,
    distance: 100,
    minMatchCharLength: 2,
    ignoreLocation: true,
  }), [products]);

  // Criar instância Fuse.js para busca fuzzy de categorias
  const categoryFuse = useMemo(() => new Fuse(CATEGORIES, {
    keys: ['name'],
    threshold: 0.35,
    ignoreLocation: true,
  }), []);

  // Criar instância Fuse.js para busca fuzzy de fornecedores
  const supplierFuse = useMemo(() => new Fuse(SUPPLIERS, {
    keys: ['name'],
    threshold: 0.35,
    ignoreLocation: true,
  }), []);

  // Generate suggestions based on query - usando busca fuzzy
  const suggestions = useMemo((): SearchResult[] => {
    const results: SearchResult[] = [];
    const searchTerm = query.trim();

    // If no query, show recent history
    if (!searchTerm) {
      history.slice(0, 5).forEach((term) => {
        results.push({
          type: "history",
          id: `history-${term}`,
          label: term,
          icon: "🕐",
        });
      });
      return results;
    }

    // Se termo muito curto, não buscar
    if (searchTerm.length < 2) {
      return results;
    }

    // Priority 0: Exact SKU match (most precise)
    const exactSkuMatch = products.find(p => 
      p.sku?.toLowerCase() === searchLower || 
      p.supplier_reference?.toLowerCase() === searchLower
    );
    if (exactSkuMatch) {
      results.push({
        type: "product",
        id: exactSkuMatch.id,
        label: exactSkuMatch.name,
        sublabel: `SKU: ${exactSkuMatch.sku || ''} • ${exactSkuMatch.category_name || ''}`,
        icon: "📦",
        data: exactSkuMatch,
      });
    }

    // Search products - busca fuzzy com priorização por relevância
    const searchLower = searchTerm.toLowerCase();
    
    // Separar por relevância: começa com > palavra exata > contém > fuzzy
    const startsWithProducts = products.filter(p => p.name.toLowerCase().startsWith(searchLower));
    const wordBoundaryRegex = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const exactWordProducts = products.filter(p => 
      !p.name.toLowerCase().startsWith(searchLower) && wordBoundaryRegex.test(p.name)
    );
    const containsProducts = products.filter(p => {
      const nl = p.name.toLowerCase();
      return !nl.startsWith(searchLower) && !wordBoundaryRegex.test(p.name) && nl.includes(searchLower);
    });
    const fuzzyOnly = productFuse.search(searchTerm)
      .filter(r => (r.score ?? 1) < 0.45)
      .map(r => r.item);

    // Ordenar cada grupo pela posição do termo no nome
    const sortByPos = (arr: Product[]) =>
      arr.sort((a, b) => {
        const posA = a.name.toLowerCase().indexOf(searchLower);
        const posB = b.name.toLowerCase().indexOf(searchLower);
        return (posA === -1 ? 9999 : posA) - (posB === -1 ? 9999 : posB);
      });
    sortByPos(startsWithProducts);
    sortByPos(exactWordProducts);
    sortByPos(containsProducts);

    // Mesclar sem duplicatas, na ordem de prioridade
    const seenIds = new Set<string>();
    const orderedProducts: Product[] = [];
    for (const group of [startsWithProducts, exactWordProducts, containsProducts, fuzzyOnly]) {
      for (const p of group) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          orderedProducts.push(p);
        }
      }
    }

    orderedProducts.slice(0, 6).forEach((product) => {
      // Skip if already added as exact SKU match
      if (results.some(r => r.id === product.id)) return;
      results.push({
        type: "product",
        id: product.id,
        label: product.name,
        sublabel: `${product.sku || ''} • ${product.category_name || ''}`,
        icon: "📦",
        data: product,
      });
    });

    // Search categories - busca fuzzy
    const matchingCategories = categoryFuse.search(searchTerm).slice(0, 3);

    matchingCategories.forEach((result) => {
      const category = result.item;
      const productCount = products.filter((p) => 
        p.category_id === String(category.id) || 
        parseInt(p.category_id || '0') === category.id
      ).length;
      results.push({
        type: "category",
        id: String(category.id),
        label: category.name,
        sublabel: `${productCount} produtos`,
        icon: category.icon || "📁",
      });
    });

    // Search suppliers - busca fuzzy
    const matchingSuppliers = supplierFuse.search(searchTerm).slice(0, 3);

    matchingSuppliers.forEach((result) => {
      const supplier = result.item;
      const productCount = products.filter((p) => 
        p.brand === supplier.id || p.supplier_reference === supplier.id
      ).length;
      results.push({
        type: "supplier",
        id: supplier.id,
        label: supplier.name,
        sublabel: `${productCount} produtos`,
        icon: "🏭",
      });
    });

    return results;
  }, [query, history, products, productFuse, categoryFuse, supplierFuse]);

  // Quick suggestions (popular/trending)
  const quickSuggestions = useMemo(() => {
    return [
      { label: "Canetas", icon: "🖊️" },
      { label: "Garrafas", icon: "🍶" },
      { label: "Ecológico", icon: "🌱" },
      { label: "Tecnologia", icon: "💻" },
      { label: "Kits", icon: "🎁" },
    ];
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    quickSuggestions,
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    isLoaded,
  };
}
