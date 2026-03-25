/**
 * CategoryCascadeSelector — Seleção de categoria com cascata de 2+ níveis,
 * breadcrumb persistente e navegação em árvore via dialog.
 */
import { useMemo, useState, useCallback } from 'react';
import { useExternalCategoriesQuery, type ExternalCategory } from '@/hooks/useExternalCategoriesQuery';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight, Folder, FolderOpen, Check, Search, TreePine, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewCategoryDialog } from './NewCategoryDialog';

interface CategoryCascadeSelectorProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

interface CatNode extends ExternalCategory {
  children: CatNode[];
  fullPath: string[];
}

function buildTree(categories: ExternalCategory[]): { roots: CatNode[]; nodeMap: Map<string, CatNode> } {
  const map = new Map<string, CatNode>();
  const roots: CatNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [], fullPath: [] });
  }
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function setPaths(node: CatNode, ancestors: string[]) {
    node.fullPath = [...ancestors, node.name];
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of node.children) setPaths(child, node.fullPath);
  }
  roots.sort((a, b) => a.name.localeCompare(b.name));
  for (const r of roots) setPaths(r, []);

  return { roots, nodeMap: map };
}

// ─── Cascade Selects ───────────────────────────
function CascadeSelects({
  roots,
  nodeMap,
  value,
  onChange,
}: {
  roots: CatNode[];
  nodeMap: Map<string, CatNode>;
  value: string;
  onChange: (id: string) => void;
}) {
  // Determine the chain of selected ancestors
  const selectedChain = useMemo(() => {
    if (!value) return [];
    const chain: string[] = [];
    let current = nodeMap.get(value);
    while (current) {
      chain.unshift(current.id);
      current = current.parent_id ? nodeMap.get(current.parent_id) : undefined;
    }
    return chain;
  }, [value, nodeMap]);

  // Build selects: one per level based on current selection
  const levels = useMemo(() => {
    const result: { items: CatNode[]; selectedId: string }[] = [];

    // Level 0: roots
    result.push({ items: roots, selectedId: selectedChain[0] || '' });

    // Subsequent levels
    for (let i = 0; i < selectedChain.length; i++) {
      const node = nodeMap.get(selectedChain[i]);
      if (node && node.children.length > 0) {
        result.push({ items: node.children, selectedId: selectedChain[i + 1] || '' });
      }
    }

    return result;
  }, [roots, nodeMap, selectedChain]);

  const handleChange = (levelIndex: number, newId: string) => {
    // When a level changes, the value becomes that id
    // If it has children, user can refine further, but we already set it
    onChange(newId);
  };

  return (
    <div className="flex items-start gap-2 flex-wrap">
      {levels.map((level, i) => (
        <div key={i} className="flex items-center gap-1.5 min-w-0">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <Select
            value={level.selectedId || undefined}
            onValueChange={(v) => handleChange(i, v)}
          >
            <SelectTrigger className="h-8 text-xs min-w-[140px] max-w-[200px]">
              <SelectValue placeholder={i === 0 ? 'Categoria raiz...' : 'Subcategoria...'} />
            </SelectTrigger>
            <SelectContent>
              {level.items.map(item => (
                <SelectItem key={item.id} value={item.id} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {item.children.length > 0 ? (
                      <Folder className="h-3 w-3 text-primary/70" />
                    ) : (
                      <span className="w-3" />
                    )}
                    {item.name}
                    {item.children.length > 0 && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({item.children.length})
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

// ─── Tree Dialog ───────────────────────────────
function TreeNode({
  node,
  selectedId,
  onSelect,
  depth,
}: {
  node: CatNode;
  selectedId: string;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(
    // Auto-expand if this node or a descendant is selected
    () => {
      if (node.id === selectedId) return true;
      const checkDescendant = (n: CatNode): boolean =>
        n.id === selectedId || n.children.some(checkDescendant);
      return checkDescendant(node);
    }
  );

  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div>
      <button
        type="button"
        className={cn(
          'flex items-center gap-1.5 w-full text-left py-1 px-2 rounded-sm text-sm hover:bg-accent/50 transition-colors',
          isSelected && 'bg-primary/10 text-primary font-medium'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setExpanded(prev => !prev);
        }}
      >
        {hasChildren ? (
          <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-transform', expanded && 'rotate-90')} />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {hasChildren ? (
          expanded ? <FolderOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" /> : <Folder className="h-3.5 w-3.5 text-primary/70 shrink-0" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="truncate flex-1">{node.name}</span>
        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryTreeDialog({
  roots,
  nodeMap,
  value,
  onChange,
}: {
  roots: CatNode[];
  nodeMap: Map<string, CatNode>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredRoots = useMemo(() => {
    if (!search) return roots;
    const q = search.toLowerCase();
    const matchIds = new Set<string>();
    for (const node of nodeMap.values()) {
      if (node.name.toLowerCase().includes(q)) {
        // Mark this and all ancestors
        let current: CatNode | undefined = node;
        while (current) {
          matchIds.add(current.id);
          current = current.parent_id ? nodeMap.get(current.parent_id) : undefined;
        }
      }
    }
    if (matchIds.size === 0) return [];
    // Filter tree keeping only matched paths
    function filterNode(node: CatNode): CatNode | null {
      if (!matchIds.has(node.id)) return null;
      return { ...node, children: node.children.map(filterNode).filter(Boolean) as CatNode[] };
    }
    return roots.map(filterNode).filter(Boolean) as CatNode[];
  }, [roots, nodeMap, search]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0">
          <TreePine className="h-3.5 w-3.5" />
          Árvore
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Navegar por Árvore de Categorias</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <ScrollArea className="h-[360px] -mx-2">
          <div className="px-2">
            {filteredRoots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma categoria encontrada</p>
            ) : (
              filteredRoots.map(root => (
                <TreeNode key={root.id} node={root} selectedId={value} onSelect={handleSelect} depth={0} />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────
export function CategoryCascadeSelector({ value, onChange, error }: CategoryCascadeSelectorProps) {
  const { data: categories = [], isLoading } = useExternalCategoriesQuery();

  const { roots, nodeMap } = useMemo(() => buildTree(categories), [categories]);

  const selectedNode = value ? nodeMap.get(value) : undefined;

  if (isLoading) {
    return <div className="h-8 bg-muted/30 rounded animate-pulse" />;
  }

  return (
    <div className="space-y-2">
      {/* Row: Cascade selects + Tree button + New */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <CascadeSelects roots={roots} nodeMap={nodeMap} value={value} onChange={onChange} />
        </div>
        <CategoryTreeDialog roots={roots} nodeMap={nodeMap} value={value} onChange={onChange} />
        <NewCategoryDialog onCreated={onChange} />
      </div>

      {/* Breadcrumb */}
      {selectedNode && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedNode.fullPath.map((segment, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
              <Badge
                variant={i === selectedNode.fullPath.length - 1 ? 'default' : 'secondary'}
                className={cn(
                  'text-[10px] py-0 px-1.5 font-normal',
                  i === selectedNode.fullPath.length - 1 && 'bg-primary/15 text-primary border-primary/20'
                )}
              >
                {segment}
              </Badge>
            </span>
          ))}
          <button
            type="button"
            className="ml-1 p-0.5 rounded hover:bg-accent transition-colors"
            onClick={() => onChange('')}
            title="Limpar seleção"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
