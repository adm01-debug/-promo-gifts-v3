import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Interface para a view categories_tree_visual
export interface CategoryTreeItem {
  id: string;
  bitrix_id?: string;
  name: string;
  level: number;
  parent_id: string | null;
  tree_structure?: string; // Visual tree representation
  sort_path?: string;
}

// Interface para categoria com filhos (árvore)
export interface CategoryNode extends CategoryTreeItem {
  children: CategoryNode[];
  productCount?: number;
  isExpanded?: boolean;
}

// Interface para opção de select
export interface CategoryOption {
  value: string;
  label: string;
  level: number;
  parent_id: string | null;
  indent: string;
}

export function useCategoriesTree() {
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'categories_tree_visual',
          operation: 'select',
          select: '*',
          orderBy: { column: 'sort_path', ascending: true },
          limit: 500,
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (!data.success) throw new Error(data.error || 'Erro ao buscar categorias');

      setCategories(data.data.records || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      console.error('Erro ao buscar árvore de categorias:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Construir árvore hierárquica
  const tree = useMemo((): CategoryNode[] => {
    if (categories.length === 0) return [];

    const nodeMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    // Criar nós
    categories.forEach(cat => {
      nodeMap.set(cat.id, {
        ...cat,
        children: [],
        isExpanded: false,
      });
    });

    // Construir hierarquia
    categories.forEach(cat => {
      const node = nodeMap.get(cat.id)!;
      if (cat.parent_id && nodeMap.has(cat.parent_id)) {
        nodeMap.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [categories]);

  // Categorias por nível
  const categoriesByLevel = useMemo(() => {
    const byLevel: Record<number, CategoryTreeItem[]> = {};
    categories.forEach(cat => {
      if (!byLevel[cat.level]) byLevel[cat.level] = [];
      byLevel[cat.level].push(cat);
    });
    return byLevel;
  }, [categories]);

  // Opções para select com indentação visual
  const selectOptions = useMemo((): CategoryOption[] => {
    return categories.map(cat => ({
      value: cat.id,
      label: cat.name,
      level: cat.level,
      parent_id: cat.parent_id,
      indent: '─'.repeat(cat.level - 1),
    }));
  }, [categories]);

  // Buscar filhos de uma categoria
  const getChildren = useCallback((parentId: string): CategoryTreeItem[] => {
    return categories.filter(cat => cat.parent_id === parentId);
  }, [categories]);

  // Buscar caminho até a raiz (breadcrumb)
  const getPath = useCallback((categoryId: string): CategoryTreeItem[] => {
    const path: CategoryTreeItem[] = [];
    let current = categories.find(cat => cat.id === categoryId);
    
    while (current) {
      path.unshift(current);
      if (current.parent_id) {
        current = categories.find(cat => cat.id === current!.parent_id);
      } else {
        current = undefined;
      }
    }
    
    return path;
  }, [categories]);

  // Buscar categorias por nome
  const searchCategories = useCallback((query: string): CategoryTreeItem[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(lowerQuery)
    );
  }, [categories]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: categories.length,
    levels: Object.keys(categoriesByLevel).length,
    roots: tree.length,
  }), [categories, categoriesByLevel, tree]);

  return {
    categories,
    tree,
    categoriesByLevel,
    selectOptions,
    stats,
    isLoading,
    error,
    fetchCategories,
    getChildren,
    getPath,
    searchCategories,
  };
}

// Hook para selecionar categoria
export function useCategorySelection(initialCategoryId?: string) {
  const { categories, getPath } = useCategoriesTree();
  const [selectedId, setSelectedId] = useState<string | null>(initialCategoryId || null);

  const selectedCategory = useMemo(() => {
    if (!selectedId) return null;
    return categories.find(cat => cat.id === selectedId) || null;
  }, [categories, selectedId]);

  const breadcrumb = useMemo(() => {
    if (!selectedId) return [];
    return getPath(selectedId);
  }, [selectedId, getPath]);

  return {
    selectedId,
    setSelectedId,
    selectedCategory,
    breadcrumb,
  };
}
