import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MaterialComplete } from "@/services/materialService";
import { Check } from "lucide-react";

interface MaterialCheckboxProps {
  material: MaterialComplete;
  isSelected: boolean;
  onToggle: (typeSlug: string) => void;
  showProductCount?: boolean;
  productCount?: number;
  disabled?: boolean;
  className?: string;
  groupHexCode?: string | null;
  compact?: boolean;
}

export function MaterialCheckbox({
  material,
  isSelected,
  onToggle,
  showProductCount = false,
  productCount = 0,
  disabled = false,
  className,
  groupHexCode,
  compact = false,
}: MaterialCheckboxProps) {
  // Suportar tanto MaterialComplete quanto formato legado
  const typeSlug = material.type_slug || (material as any).slug || '';
  const typeName = material.type_name || (material as any).name || '';
  const hexCode = groupHexCode || material.group_hex_code || null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => !disabled && onToggle(typeSlug)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md transition-all duration-150",
          isSelected 
            ? "bg-primary/10 text-foreground" 
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {/* Indicador de seleção minimalista */}
        <span className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200",
          isSelected 
            ? "border-primary bg-primary" 
            : "border-muted-foreground/30"
        )}>
          {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
        </span>
        
        {/* Cor do material */}
        {hexCode && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: hexCode }}
          />
        )}
        
        {/* Nome */}
        <span className={cn(
          "text-sm truncate flex-1",
          isSelected && "font-medium"
        )}>
          {typeName}
        </span>
        
        {/* Contador */}
        {showProductCount && productCount > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {productCount}
          </span>
        )}
      </button>
    );
  }
  
  return (
    <label
      className={cn(
        "group flex items-center gap-2.5 py-2 px-2.5 rounded-lg cursor-pointer transition-all duration-200",
        isSelected 
          ? "bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm" 
          : "hover:bg-muted/60",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Checkbox customizado */}
      <div className="relative">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => !disabled && onToggle(typeSlug)}
          disabled={disabled}
          className={cn(
            "transition-all duration-200",
            "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
            "group-hover:border-primary/50"
          )}
        />
        {/* Efeito de pulse quando selecionado */}
        {isSelected && (
          <span className="absolute inset-0 rounded animate-ping bg-primary/20 pointer-events-none" 
                style={{ animationDuration: '1.5s', animationIterationCount: '1' }} 
          />
        )}
      </div>
      
      {/* Indicador de cor do grupo */}
      {hexCode && (
        <span
          className={cn(
            "w-3 h-3 rounded-full flex-shrink-0 transition-all duration-200 ring-1",
            isSelected 
              ? "ring-primary/50 scale-110" 
              : "ring-border/50 group-hover:scale-105"
          )}
          style={{ 
            backgroundColor: hexCode,
            boxShadow: isSelected ? `0 2px 8px ${hexCode}50` : 'none'
          }}
        />
      )}
      
      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={cn(
          "text-sm truncate transition-colors duration-200",
          isSelected 
            ? "font-medium text-foreground" 
            : "text-muted-foreground group-hover:text-foreground"
        )}>
          {typeName}
        </span>
        
        {/* Indicador visual de seleção */}
        {isSelected && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
      </div>
      
      {/* Contador de produtos */}
      {showProductCount && productCount > 0 && (
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-full transition-colors duration-200",
          isSelected 
            ? "bg-primary/20 text-primary font-medium" 
            : "bg-muted text-muted-foreground"
        )}>
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
  hexCode?: string | null;
}

export function SimpleMaterialCheckbox({
  name,
  slug,
  isSelected,
  onToggle,
  count,
  hexCode,
}: SimpleMaterialCheckboxProps) {
  return (
    <label className={cn(
      "flex items-center gap-2 py-1.5 px-2 cursor-pointer rounded-md transition-all duration-150",
      isSelected 
        ? "bg-primary/10" 
        : "hover:bg-muted/50"
    )}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(slug)}
        className="data-[state=checked]:bg-primary"
      />
      
      {hexCode && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: hexCode }}
        />
      )}
      
      <span className={cn(
        "text-sm flex-1 truncate",
        isSelected ? "font-medium text-foreground" : "text-muted-foreground"
      )}>
        {name}
      </span>
      
      {count !== undefined && count > 0 && (
        <span className={cn(
          "text-[10px] px-1 rounded",
          isSelected ? "text-primary" : "text-muted-foreground"
        )}>
          {count}
        </span>
      )}
    </label>
  );
}

// Versão para grid de seleção rápida
interface QuickMaterialCheckboxProps {
  name: string;
  slug: string;
  isSelected: boolean;
  onToggle: (slug: string) => void;
  hexCode?: string | null;
}

export function QuickMaterialCheckbox({
  name,
  slug,
  isSelected,
  onToggle,
  hexCode,
}: QuickMaterialCheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(slug)}
      className={cn(
        "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-all duration-200",
        isSelected
          ? "bg-primary text-primary-foreground font-medium shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {hexCode && (
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            isSelected && "ring-1 ring-primary-foreground/50"
          )}
          style={{ backgroundColor: hexCode }}
        />
      )}
      <span className="truncate max-w-[80px]">{name}</span>
      {isSelected && (
        <Check className="w-3 h-3 flex-shrink-0" />
      )}
    </button>
  );
}
