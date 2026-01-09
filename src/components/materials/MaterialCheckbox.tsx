import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MaterialComplete } from "@/services/materialService";

interface MaterialCheckboxProps {
  material: MaterialComplete;
  isSelected: boolean;
  onToggle: (typeSlug: string) => void;
  showProductCount?: boolean;
  productCount?: number;
  disabled?: boolean;
  className?: string;
}

export function MaterialCheckbox({
  material,
  isSelected,
  onToggle,
  showProductCount = false,
  productCount = 0,
  disabled = false,
  className,
}: MaterialCheckboxProps) {
  // Suportar tanto MaterialComplete quanto formato legado
  const typeSlug = material.type_slug || (material as any).slug || '';
  const typeName = material.type_name || (material as any).name || '';
  
  return (
    <label
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
        isSelected ? "bg-primary/5" : "hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => !disabled && onToggle(typeSlug)}
        disabled={disabled}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm truncate block",
          isSelected ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {typeName}
        </span>
      </div>
      
      {showProductCount && productCount > 0 && (
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {productCount}
        </span>
      )}
    </label>
  );
}

// Versão simplificada para uso inline
interface SimpleMaterialCheckboxProps {
  name: string;
  slug: string;
  isSelected: boolean;
  onToggle: (slug: string) => void;
  count?: number;
}

export function SimpleMaterialCheckbox({
  name,
  slug,
  isSelected,
  onToggle,
  count,
}: SimpleMaterialCheckboxProps) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-1">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(slug)}
        className="data-[state=checked]:bg-primary"
      />
      <span className={cn(
        "text-sm flex-1",
        isSelected ? "font-medium" : "text-muted-foreground"
      )}>
        {name}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </label>
  );
}
