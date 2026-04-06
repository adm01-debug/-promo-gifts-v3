import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronDown, 
  FolderOpen, 
  Folder, 
  Search, 
  X,
  Package,
  Home 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useCategoriesTree, useCategorySelection, CategoryNode, CategoryTreeItem } from "@/hooks/useCategoriesTree";

interface CategoryTreeNavigatorProps {
  onSelectCategory?: (category: CategoryTreeItem | null) => void;
  selectedCategoryId?: string | null;
  className?: string;
  showSearch?: boolean;
  showBreadcrumb?: boolean;
  maxHeight?: string;
}

export function CategoryTreeNavigator({
  onSelectCategory,
  selectedCategoryId,
  className,
  showSearch = true,
  showBreadcrumb = true,
  maxHeight = "400px",
}: CategoryTreeNavigatorProps) {
  const { tree, categories, stats, isLoading, searchCategories, getPath } = useCategoriesTree();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchCategories(searchQuery);
  }, [searchQuery, searchCategories]);

  // Breadcrumb for selected category
  const breadcrumbPath = useMemo(() => {
    if (!selectedCategoryId) return [];
    return getPath(selectedCategoryId);
  }, [selectedCategoryId, getPath]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleSelectCategory = (category: CategoryTreeItem) => {
    onSelectCategory?.(category);
    // Auto-expand parents when selecting from search
    if (category.parent_id) {
      const path = getPath(category.id);
      const newExpanded = new Set(expandedNodes);
      path.forEach(cat => newExpanded.add(cat.id));
      setExpandedNodes(newExpanded);
    }
    setSearchQuery("");
  };

  const handleClearSelection = () => {
    onSelectCategory?.(null);
  };

  // Render tree node recursively
  const renderNode = (node: CategoryNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedCategoryId === node.id;
    const isHovered = hoveredNode === node.id;

    return (
      <div key={node.id}>
        <motion.div
          initial={false}
          animate={{
            backgroundColor: isSelected 
              ? "hsl(var(--primary) / 0.1)" 
              : isHovered 
                ? "hsl(var(--muted))" 
                : "transparent",
          }}
          className={cn(
            "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
            "hover:bg-muted",
            isSelected && "bg-primary/10 text-primary font-medium"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleSelectCategory(node)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) = aria-label="Recolher"> {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="p-0.5 hover:bg-muted-foreground/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* Folder Icon */}
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-primary/70" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <Package className="h-4 w-4 text-muted-foreground/70" />
          )}

          {/* Category Name */}
          <span className="text-sm truncate flex-1">{node.name}</span>

          {/* Children Count Badge */}
          {hasChildren && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {node.children.length}
            </Badge>
          )}
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {node.children.map(child => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-muted rounded" style={{ marginLeft: `${(i % 3) * 16}px` }}></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            Categorias
            <Badge variant="secondary" className="ml-1">
              {stats.total}
            </Badge>
          </CardTitle>
          {selectedCategoryId && (
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Breadcrumb */}
        {showBreadcrumb && breadcrumbPath.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={handleClearSelection}
                  className="cursor-pointer hover:text-foreground"
                >
                  <Home className="h-3.5 w-3.5" />
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbPath.map((cat, index) => (
                <BreadcrumbItem key={cat.id}>
                  <BreadcrumbSeparator />
                  {index === breadcrumbPath.length - 1 ? (
                    <BreadcrumbPage className="text-xs">{cat.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink 
                      onClick={() => handleSelectCategory(cat)}
                      className="cursor-pointer text-xs hover:text-foreground"
                    >
                      {cat.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea style={{ maxHeight }}>
          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <div className="mb-3 pb-3 border-b">
              <p className="text-xs text-muted-foreground mb-2">
                {searchResults.length} resultados para "{searchQuery}"
              </p>
              {searchResults.slice(0, 10).map(cat => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer hover:bg-muted",
                    selectedCategoryId === cat.id && "bg-primary/10"
                  )}
                  onClick={() => handleSelectCategory(cat)}
                >
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{cat.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    Nível {cat.level}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}

          {/* Tree View */}
          {!searchQuery && (
            <div className="space-y-0.5">
              {tree.map(node => renderNode(node, 0))}
            </div>
          )}

          {/* Empty State */}
          {!searchQuery && tree.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma categoria encontrada</p>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum resultado para "{searchQuery}"</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Compact Category Selector for filters
interface CategorySelectorProps {
  value?: string | null;
  onChange?: (categoryId: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function CategorySelector({ value, onChange, placeholder = "Selecionar categoria", className }: CategorySelectorProps) {
  const { categories, getPath } = useCategoriesTree();
  const [isOpen, setIsOpen] = useState(false);

  const selectedCategory = categories.find(c => c.id === value);
  const breadcrumb = value ? getPath(value) : [];

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span className="truncate">
          {selectedCategory ? (
            breadcrumb.map(c => c.name).join(" > ")
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-50 mt-1"
          >
            <CategoryTreeNavigator
              selectedCategoryId={value}
              onSelectCategory={(cat) => {
                onChange?.(cat?.id || null);
                setIsOpen(false);
              }}
              showBreadcrumb={false}
              maxHeight="300px"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
