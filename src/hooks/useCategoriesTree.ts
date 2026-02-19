import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Palavras que devem permanecer em minúsculo (preposições, artigos, conjunções)
const LOWERCASE_WORDS = ['e', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com'];

// Categorias que devem ser ocultadas da árvore (nomes em uppercase para comparação)
const HIDDEN_CATEGORIES = [
  'GRAVAÇÃO | MOCHILA',
  'GRAVACAO | MOCHILA',
];

// Função para formatar nome em Title Case (Primeira Maiúscula, exceto preposições)
const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Primeira palavra sempre com maiúscula, ou se não for uma preposição
      if (index === 0 || !LOWERCASE_WORDS.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
};

// Interface para a view categories_tree_visual
export interface CategoryTreeItem {
  id: string;
  bitrix_id?: string;
  name: string;
  level: number;
  parent_id: string | null;
  tree_structure?: string; // Visual tree representation
  sort_path?: string;
  icon?: string; // Emoji icon for root categories
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

// Interface para category icons
interface CategoryIcon {
  category_name: string;
  icon: string;
}

export function useCategoriesTree() {
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [categoryIcons, setCategoryIcons] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch category icons from Supabase
  const fetchCategoryIcons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('category_icons')
        .select('category_name, icon')
        .eq('is_active', true);

      if (error) throw error;
      
      const iconMap = new Map<string, string>();
      (data as CategoryIcon[] || []).forEach(item => {
        iconMap.set(item.category_name.toUpperCase(), item.icon);
      });
      setCategoryIcons(iconMap);
    } catch (err) {
      console.error('Erro ao buscar ícones de categorias:', err);
    }
  }, []);

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

      // Aplicar Title Case nos nomes das categorias
      const formattedCategories = (data.data.records || [])
        .filter((cat: CategoryTreeItem) => !HIDDEN_CATEGORIES.includes(cat.name.toUpperCase()))
        .map((cat: CategoryTreeItem) => ({
          ...cat,
          name: toTitleCase(cat.name),
        }));
      setCategories(formattedCategories);
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
    fetchCategoryIcons();
  }, [fetchCategories, fetchCategoryIcons]);

  // Construir árvore hierárquica
  const tree = useMemo((): CategoryNode[] => {
    if (categories.length === 0) return [];

    const nodeMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    // Primeiro passo: Criar todos os nós
    categories.forEach(cat => {
      const isRoot = cat.level === 1 || !cat.parent_id;
      const normalizedName = cat.name.toUpperCase();
      const icon = isRoot ? categoryIcons.get(normalizedName) : undefined;
      
      nodeMap.set(cat.id, {
        ...cat,
        icon,
        children: [],
        isExpanded: false,
      });
    });

    // Segundo passo: Construir hierarquia vinculando filhos aos pais
    categories.forEach(cat => {
      const node = nodeMap.get(cat.id);
      if (!node) return;
      
      if (cat.parent_id) {
        const parentNode = nodeMap.get(cat.parent_id);
        if (parentNode) {
          // Verificar se o filho já não está na lista (evitar duplicatas)
          if (!parentNode.children.find(c => c.id === node.id)) {
            parentNode.children.push(node);
          }
        } else {
          // Se não encontrar o pai, adicionar como raiz
          roots.push(node);
        }
      } else {
        // Sem parent_id = categoria raiz
        roots.push(node);
      }
    });

    // Ordenar filhos por sort_path ou nome
    const sortChildren = (nodes: CategoryNode[]) => {
      nodes.sort((a, b) => {
        // sort_path pode ser array ou string
        if (a.sort_path && b.sort_path) {
          const aPath = Array.isArray(a.sort_path) ? a.sort_path.join('-') : String(a.sort_path);
          const bPath = Array.isArray(b.sort_path) ? b.sort_path.join('-') : String(b.sort_path);
          return aPath.localeCompare(bPath);
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };
    
    sortChildren(roots);

    return roots;
  }, [categories, categoryIcons]);

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
