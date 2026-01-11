import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import type { SegmentoComplete } from "@/types/ramo-atividade";

interface SegmentoCheckboxProps {
  segmento: SegmentoComplete;
  isSelected: boolean;
  onToggle: (segmentoSlug: string) => void;
  ramoHexCode?: string | null;
  compact?: boolean;
}

export function SegmentoCheckbox({
  segmento,
  isSelected,
  onToggle,
  ramoHexCode,
  compact = false,
}: SegmentoCheckboxProps) {
  if (compact) {
    return (
      <label
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all duration-150",
          isSelected
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(segmento.segmento_slug)}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        
        
        <span className={cn(
          "text-xs truncate",
          isSelected && "font-medium"
        )}>
          {segmento.segmento_name}
        </span>
      </label>
    );
  }

  return (
    <label
      className={cn(
        "flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200",
        isSelected
          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(segmento.segmento_slug)}
        className={cn(
          "w-4 h-4 transition-all duration-200",
          "data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        )}
      />
      
      <span className={cn(
        "text-sm truncate flex-1",
        isSelected && "font-medium"
      )}>
        {segmento.segmento_name}
      </span>
      
      {/* Descrição se houver */}
      {segmento.segmento_description && !isSelected && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
          {segmento.segmento_description}
        </span>
      )}
    </label>
  );
}
