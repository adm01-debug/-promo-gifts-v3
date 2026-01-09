import React from "react";
import { Gem, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MaterialBadge } from "./MaterialBadge";
import { MaterialGroup, MaterialComplete } from "@/services/materialService";

interface MaterialSummaryProps {
  selectedGroups: string[];
  selectedTypes: string[];
  groups: MaterialGroup[];
  materials: MaterialComplete[];
  onRemoveGroup: (slug: string) => void;
  onRemoveType: (slug: string) => void;
  onClearAll: () => void;
  className?: string;
  maxVisible?: number;
  variant?: "default" | "compact" | "inline";
}

export function MaterialSummary({
  selectedGroups,
  selectedTypes,
  groups,
  materials,
  onRemoveGroup,
  onRemoveType,
  onClearAll,
  className,
  maxVisible = 6,
  variant = "default",
}: MaterialSummaryProps) {
  const totalSelected = selectedGroups.length + selectedTypes.length;

  if (totalSelected === 0) {
    return null;
  }

  const allItems = [
    ...selectedGroups.map(slug => {
      const group = groups.find(g => g.group_slug === slug);
      return group ? {
        type: 'group' as const,
        slug,
        name: group.group_name,
        hexCode: group.group_hex_code,
      } : null;
    }),
    ...selectedTypes.map(slug => {
      const material = materials.find(m => m.type_slug === slug);
      const group = material ? groups.find(g => g.group_slug === material.group_slug) : null;
      return material ? {
        type: 'material' as const,
        slug,
        name: material.type_name,
        hexCode: group?.group_hex_code,
        groupName: material.group_name,
      } : null;
    }),
  ].filter(Boolean) as Array<{
    type: 'group' | 'material';
    slug: string;
    name: string;
    hexCode?: string | null;
    groupName?: string;
  }>;

  const visibleItems = allItems.slice(0, maxVisible);
  const hiddenCount = allItems.length - maxVisible;

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Gem className="w-3 h-3" />
          Materiais:
        </span>
        {visibleItems.map((item) => (
          <MaterialBadge
            key={`${item.type}-${item.slug}`}
            name={item.name}
            hexCode={item.hexCode}
            size="sm"
            variant={item.type === 'group' ? 'solid' : 'outline'}
            onRemove={() => 
              item.type === 'group' 
                ? onRemoveGroup(item.slug) 
                : onRemoveType(item.slug)
            }
            showTooltip
          />
        ))}
        {hiddenCount > 0 && (
          <span className="text-xs text-muted-foreground">
            +{hiddenCount} mais
          </span>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg",
        className
      )}>
        <Gem className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {visibleItems.slice(0, 3).map((item, index) => (
            <React.Fragment key={`${item.type}-${item.slug}`}>
              {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
              <span className="text-sm truncate">
                {item.name}
              </span>
            </React.Fragment>
          ))}
          {allItems.length > 3 && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              +{allItems.length - 3}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      "p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
            <Gem className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Materiais Selecionados
          </span>
          <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
            {totalSelected}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Limpar
        </button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {visibleItems.map((item) => (
          <MaterialBadge
            key={`${item.type}-${item.slug}`}
            name={item.name}
            groupName={item.type === 'material' ? item.groupName : undefined}
            hexCode={item.hexCode}
            size="sm"
            variant={item.type === 'group' ? 'solid' : 'outline'}
            onRemove={() => 
              item.type === 'group' 
                ? onRemoveGroup(item.slug) 
                : onRemoveType(item.slug)
            }
            showTooltip
          />
        ))}
        {hiddenCount > 0 && (
          <span className="text-xs text-muted-foreground self-center px-2">
            +{hiddenCount} mais
          </span>
        )}
      </div>
    </div>
  );
}

// Versão mini para exibição em cards de produto
export function MiniMaterialSummary({
  materials,
  maxVisible = 2,
  className,
}: {
  materials: MaterialComplete[];
  maxVisible?: number;
  className?: string;
}) {
  if (!materials || materials.length === 0) {
    return null;
  }

  const visible = materials.slice(0, maxVisible);
  const hiddenCount = materials.length - maxVisible;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {visible.map((material) => (
        <span
          key={material.type_id}
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground"
        >
          {material.group_hex_code && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: material.group_hex_code }}
            />
          )}
          {material.type_name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="text-[10px] text-muted-foreground">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
