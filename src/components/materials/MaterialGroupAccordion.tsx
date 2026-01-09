import React, { useState } from "react";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
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
}: MaterialGroupAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const selectedCount = types.filter(t => selectedTypes.includes(t.type_slug)).length;
  const hasSelection = selectedCount > 0 || isGroupSelected;

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-colors",
      hasSelection ? "border-primary/30 bg-primary/5" : "border-border"
    )}>
      {/* Header do grupo */}
      <div className="flex items-center gap-2 p-3 bg-muted/30">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-0.5 hover:bg-muted rounded transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        
        <label className="flex items-center gap-2 flex-1 cursor-pointer">
          <Checkbox
            checked={isGroupSelected}
            onCheckedChange={() => onGroupToggle(group.group_slug)}
            className="data-[state=checked]:bg-primary"
          />
          
          {group.group_hex_code && (
            <span
              className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0"
              style={{ backgroundColor: group.group_hex_code }}
            />
          )}
          
          <span className={cn(
            "font-medium text-sm",
            hasSelection ? "text-primary" : "text-foreground"
          )}>
            {group.group_name}
          </span>
        </label>

        {/* Contadores */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
              {selectedCount}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span>{group.total_materials}</span>
            {showProductCounts && (
              <>
                <span>•</span>
                <Package className="w-3 h-3" />
                <span>{group.products_using}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Lista de tipos */}
      {isOpen && types.length > 0 && (
        <div className="p-2 space-y-0.5 border-t border-border/50">
          {types.map(type => (
            <MaterialCheckbox
              key={type.type_id}
              material={type}
              isSelected={selectedTypes.includes(type.type_slug)}
              onToggle={onTypeToggle}
            />
          ))}
        </div>
      )}

      {/* Mensagem se não houver tipos */}
      {isOpen && types.length === 0 && (
        <div className="p-4 text-center text-sm text-muted-foreground border-t border-border/50">
          Nenhum material neste grupo
        </div>
      )}
    </div>
  );
}
