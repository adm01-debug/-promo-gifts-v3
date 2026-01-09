import React from "react";
import { Package, Layers } from "lucide-react";
import { MaterialComplete } from "@/services/materialService";
import { MaterialBadge } from "./MaterialBadge";
import { cn } from "@/lib/utils";

interface MaterialCompositionProps {
  materials: MaterialComplete[];
  layout?: "horizontal" | "vertical" | "grid";
  showGroupName?: boolean;
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MaterialComposition({
  materials,
  layout = "horizontal",
  showGroupName = false,
  maxVisible = 5,
  size = "md",
  className,
}: MaterialCompositionProps) {
  if (!materials || materials.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        Nenhum material especificado
      </div>
    );
  }

  const visibleMaterials = materials.slice(0, maxVisible);
  const remainingCount = materials.length - maxVisible;

  const layoutClasses = {
    horizontal: "flex flex-wrap gap-1.5",
    vertical: "flex flex-col gap-1",
    grid: "grid grid-cols-2 gap-1.5",
  };

  return (
    <div className={cn(layoutClasses[layout], className)}>
      {visibleMaterials.map((material) => (
        <MaterialBadge
          key={material.type_id}
          name={material.type_name}
          groupName={material.group_name}
          hexCode={material.group_hex_code}
          showGroup={showGroupName}
          size={size}
        />
      ))}
      
      {remainingCount > 0 && (
        <span className={cn(
          "inline-flex items-center rounded-full bg-muted text-muted-foreground font-medium",
          size === "sm" && "text-xs px-2 py-0.5",
          size === "md" && "text-xs px-2.5 py-1",
          size === "lg" && "text-sm px-3 py-1.5"
        )}>
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

// Componente para exibir composição agrupada por grupo de material
interface GroupedMaterialCompositionProps {
  materials: MaterialComplete[];
  className?: string;
}

export function GroupedMaterialComposition({
  materials,
  className,
}: GroupedMaterialCompositionProps) {
  if (!materials || materials.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        Composição não especificada
      </div>
    );
  }

  // Agrupar por grupo
  const byGroup = new Map<string, MaterialComplete[]>();
  materials.forEach(m => {
    const existing = byGroup.get(m.group_slug) || [];
    existing.push(m);
    byGroup.set(m.group_slug, existing);
  });

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from(byGroup.entries()).map(([groupSlug, groupMaterials]) => (
        <div key={groupSlug} className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Layers className="w-3.5 h-3.5" />
            <span>{groupMaterials[0].group_name}</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {groupMaterials.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-5">
            {groupMaterials.map(m => (
              <MaterialBadge
                key={m.type_id}
                name={m.type_name}
                hexCode={m.group_hex_code}
                size="sm"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Componente compacto para cards de produto
interface CompactMaterialListProps {
  materialNames: string[];
  maxVisible?: number;
  className?: string;
}

export function CompactMaterialList({
  materialNames,
  maxVisible = 2,
  className,
}: CompactMaterialListProps) {
  if (!materialNames || materialNames.length === 0) {
    return null;
  }

  const visible = materialNames.slice(0, maxVisible);
  const remaining = materialNames.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((name) => (
        <span
          key={name}
          className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium"
        >
          {name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium">
          +{remaining}
        </span>
      )}
    </div>
  );
}
