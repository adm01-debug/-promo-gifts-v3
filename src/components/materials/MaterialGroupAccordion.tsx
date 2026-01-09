import React, { useState } from "react";
import { ChevronDown, ChevronRight, Package, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MaterialGroup, MaterialComplete } from "@/services/materialService";
import { MaterialCheckbox } from "./MaterialCheckbox";

interface MaterialGroupAccordionProps {
  group: MaterialGroup;
  types: MaterialComplete[];
  isGroupSelected: boolean;
  selectedTypes: string[];
  onGroupToggle: (groupSlug: string) => void;
  onTypeToggle: (typeSlug: string) => void;
  defaultOpen?: boolean;
  showProductCounts?: boolean;
  compact?: boolean;
}

export function MaterialGroupAccordion({
  group,
  types,
  isGroupSelected,
  selectedTypes,
  onGroupToggle,
  onTypeToggle,
  defaultOpen = false,
  showProductCounts = true,
  compact = false,
}: MaterialGroupAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const selectedCount = types.filter(t => selectedTypes.includes(t.type_slug)).length;
  const hasSelection = selectedCount > 0 || isGroupSelected;
  const allTypesSelected = types.length > 0 && types.every(t => selectedTypes.includes(t.type_slug));

  if (compact) {
    return (
      <div className={cn(
        "rounded-md overflow-hidden transition-all duration-200",
        hasSelection ? "bg-primary/5" : "bg-muted/20"
      )}>
        {/* Header compacto */}
        <div className="flex items-center gap-2 p-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-0.5 hover:bg-muted rounded transition-colors"
          >
            <ChevronDown className={cn(
              "w-3 h-3 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
          
          <label className="flex items-center gap-2 flex-1 cursor-pointer">
            <Checkbox
              checked={isGroupSelected || allTypesSelected}
              onCheckedChange={() => onGroupToggle(group.group_slug)}
              className="data-[state=checked]:bg-primary"
            />
            
            {group.group_hex_code && (
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: group.group_hex_code }}
              />
            )}
            
            <span className={cn(
              "text-sm",
              hasSelection ? "font-medium text-primary" : "text-foreground"
            )}>
              {group.group_name}
            </span>
          </label>

          <span className="text-[10px] text-muted-foreground">
            {selectedCount > 0 && `${selectedCount}/`}{group.total_materials}
          </span>
        </div>

        {/* Lista compacta */}
        {isOpen && types.length > 0 && (
          <div className="px-2 pb-2 space-y-0.5 ml-6 border-l-2 border-muted">
            {types.map(type => (
              <MaterialCheckbox
                key={type.type_id}
                material={type}
                isSelected={selectedTypes.includes(type.type_slug)}
                onToggle={onTypeToggle}
                groupHexCode={group.group_hex_code}
                compact
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl overflow-hidden transition-all duration-300",
      hasSelection 
        ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-primary/25 shadow-sm" 
        : "bg-muted/30 hover:bg-muted/40"
    )}>
      {/* Header do grupo */}
      <div className="flex items-center gap-3 p-3">
        {/* Botão de expandir */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "p-1.5 rounded-lg transition-all duration-200",
            isOpen 
              ? "bg-primary/15 text-primary" 
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-300",
            isOpen && "rotate-180"
          )} />
        </button>
        
        {/* Checkbox do grupo */}
        <div className="relative">
          <Checkbox
            checked={isGroupSelected || allTypesSelected}
            onCheckedChange={() => onGroupToggle(group.group_slug)}
            className={cn(
              "w-5 h-5 transition-all duration-200",
              "data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            )}
          />
          {/* Indicador de seleção parcial */}
          {selectedCount > 0 && !isGroupSelected && !allTypesSelected && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </div>
        
        {/* Cor do grupo */}
        <div 
          className={cn(
            "w-5 h-5 rounded-full flex-shrink-0 transition-all duration-300",
            hasSelection && "ring-2 ring-offset-1 ring-offset-background ring-primary/40 scale-110"
          )}
          style={{ 
            backgroundColor: group.group_hex_code || 'hsl(var(--muted))',
            boxShadow: group.group_hex_code && hasSelection 
              ? `0 4px 12px ${group.group_hex_code}50` 
              : 'none'
          }}
        />
        
        {/* Info do grupo */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            "font-medium text-sm transition-colors duration-200",
            hasSelection ? "text-primary" : "text-foreground"
          )}>
            {group.group_name}
          </span>
          
          {/* Descrição se houver */}
          {group.group_description && !isOpen && (
            <p className="text-xs text-muted-foreground truncate">
              {group.group_description}
            </p>
          )}
        </div>

        {/* Contadores */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Badge de selecionados */}
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center shadow-sm">
              {selectedCount}
            </span>
          )}
          
          {/* Total de materiais */}
          <div className={cn(
            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors",
            hasSelection 
              ? "bg-primary/15 text-primary" 
              : "bg-muted text-muted-foreground"
          )}>
            <span className="font-medium">{group.total_materials}</span>
            <span className="text-[10px]">itens</span>
          </div>
          
          {/* Contador de produtos usando */}
          {showProductCounts && group.products_using > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="w-3 h-3" />
              <span>{group.products_using}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lista de tipos - Animada */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        {types.length > 0 && (
          <div className="px-3 pb-3 space-y-1">
            <div className="border-t border-border/30 pt-2 ml-10 space-y-0.5">
              {/* Selecionar todos */}
              {types.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    if (allTypesSelected) {
                      types.forEach(t => onTypeToggle(t.type_slug));
                    } else {
                      types.filter(t => !selectedTypes.includes(t.type_slug))
                           .forEach(t => onTypeToggle(t.type_slug));
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full text-xs py-1.5 px-2 rounded-md transition-colors mb-1",
                    allTypesSelected
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Check className={cn(
                    "w-3 h-3",
                    allTypesSelected ? "opacity-100" : "opacity-30"
                  )} />
                  <span>{allTypesSelected ? "Desmarcar todos" : "Selecionar todos"}</span>
                </button>
              )}
              
              {/* Lista de materiais */}
              {types.map(type => (
                <MaterialCheckbox
                  key={type.type_id}
                  material={type}
                  isSelected={selectedTypes.includes(type.type_slug)}
                  onToggle={onTypeToggle}
                  groupHexCode={group.group_hex_code}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mensagem se não houver tipos */}
        {types.length === 0 && (
          <div className="px-3 pb-3">
            <div className="border-t border-border/30 pt-3 ml-10">
              <p className="text-xs text-muted-foreground italic text-center py-2">
                Nenhum material neste grupo
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
