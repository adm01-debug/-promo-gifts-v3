import React, { useState } from "react";
import { ChevronDown, Building2, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { RamoAtividadeGroup, SegmentoComplete } from "@/types/ramo-atividade";
import { SegmentoCheckbox } from "./SegmentoCheckbox";

interface RamoAtividadeGroupAccordionProps {
  group: RamoAtividadeGroup;
  segmentos: SegmentoComplete[];
  isRamoSelected: boolean;
  selectedSegmentos: string[];
  onRamoToggle: (ramoSlug: string) => void;
  onSegmentoToggle: (segmentoSlug: string) => void;
  defaultOpen?: boolean;
  showProductCounts?: boolean;
  compact?: boolean;
}

export function RamoAtividadeGroupAccordion({
  group,
  segmentos,
  isRamoSelected,
  selectedSegmentos,
  onRamoToggle,
  onSegmentoToggle,
  defaultOpen = false,
  showProductCounts = true,
  compact = false,
}: RamoAtividadeGroupAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const selectedCount = segmentos.filter(s => selectedSegmentos.includes(s.segmento_slug)).length;
  const hasSelection = selectedCount > 0 || isRamoSelected;
  const allSegmentosSelected = segmentos.length > 0 && segmentos.every(s => selectedSegmentos.includes(s.segmento_slug));

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
              checked={isRamoSelected || allSegmentosSelected}
              onCheckedChange={() => onRamoToggle(group.group_slug)}
              className="data-[state=checked]:bg-primary"
            />
            
            {group.group_hex_code ? (
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: group.group_hex_code }}
              />
            ) : group.group_icon ? (
              <span className="text-xs">{group.group_icon}</span>
            ) : (
              <Building2 className="w-3 h-3 text-muted-foreground" />
            )}
            
            <span className={cn(
              "text-sm",
              hasSelection ? "font-medium text-primary" : "text-foreground"
            )}>
              {group.group_name}
            </span>
          </label>

          <span className="text-[10px] text-muted-foreground">
            {selectedCount > 0 && `${selectedCount}/`}{group.total_segmentos}
          </span>
        </div>

        {/* Lista compacta */}
        {isOpen && segmentos.length > 0 && (
          <div className="px-2 pb-2 space-y-0.5 ml-6 border-l-2 border-muted">
            {segmentos.map(segmento => (
              <SegmentoCheckbox
                key={segmento.segmento_id}
                segmento={segmento}
                isSelected={selectedSegmentos.includes(segmento.segmento_slug)}
                onToggle={onSegmentoToggle}
                ramoHexCode={group.group_hex_code}
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
            checked={isRamoSelected || allSegmentosSelected}
            onCheckedChange={() => onRamoToggle(group.group_slug)}
            className={cn(
              "w-5 h-5 transition-all duration-200",
              "data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            )}
          />
          {/* Indicador de seleção parcial */}
          {selectedCount > 0 && !isRamoSelected && !allSegmentosSelected && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </div>
        
        {/* Ícone/Cor do grupo */}
        {group.group_hex_code ? (
          <div 
            className={cn(
              "w-5 h-5 rounded-full flex-shrink-0 transition-all duration-300",
              hasSelection && "ring-2 ring-offset-1 ring-offset-background ring-primary/40 scale-110"
            )}
            style={{ 
              backgroundColor: group.group_hex_code,
              boxShadow: group.group_hex_code && hasSelection 
                ? `0 4px 12px ${group.group_hex_code}50` 
                : 'none'
            }}
          />
        ) : group.group_icon ? (
          <span className="text-lg">{group.group_icon}</span>
        ) : (
          <Building2 className={cn(
            "w-5 h-5 flex-shrink-0",
            hasSelection ? "text-primary" : "text-muted-foreground"
          )} />
        )}
        
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
          
          {/* Total de segmentos */}
          <div className={cn(
            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors",
            hasSelection 
              ? "bg-primary/15 text-primary" 
              : "bg-muted text-muted-foreground"
          )}>
            <span className="font-medium">{group.total_segmentos}</span>
            <span className="text-[10px]">seg.</span>
          </div>
        </div>
      </div>

      {/* Lista de segmentos - Animada */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        {segmentos.length > 0 && (
          <div className="px-3 pb-3 space-y-1">
            <div className="border-t border-border/30 pt-2 ml-10 space-y-0.5">
              {/* Selecionar todos */}
              {segmentos.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    if (allSegmentosSelected) {
                      segmentos.forEach(s => onSegmentoToggle(s.segmento_slug));
                    } else {
                      segmentos.filter(s => !selectedSegmentos.includes(s.segmento_slug))
                               .forEach(s => onSegmentoToggle(s.segmento_slug));
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full text-xs py-1.5 px-2 rounded-md transition-colors mb-1",
                    allSegmentosSelected
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Check className={cn(
                    "w-3 h-3",
                    allSegmentosSelected ? "opacity-100" : "opacity-30"
                  )} />
                  <span>{allSegmentosSelected ? "Desmarcar todos" : "Selecionar todos"}</span>
                </button>
              )}
              
              {/* Lista de segmentos */}
              {segmentos.map(segmento => (
                <SegmentoCheckbox
                  key={segmento.segmento_id}
                  segmento={segmento}
                  isSelected={selectedSegmentos.includes(segmento.segmento_slug)}
                  onToggle={onSegmentoToggle}
                  ramoHexCode={group.group_hex_code}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mensagem se não houver segmentos */}
        {segmentos.length === 0 && (
          <div className="px-3 pb-3">
            <div className="border-t border-border/30 pt-3 ml-10">
              <p className="text-xs text-muted-foreground italic text-center py-2">
                Nenhum segmento neste ramo
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
