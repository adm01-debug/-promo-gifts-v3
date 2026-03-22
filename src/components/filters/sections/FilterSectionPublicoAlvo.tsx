import React from "react";
import { Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PUBLICO_ALVO } from "@/data/mockData";
import { toTitleCase } from "@/lib/textUtils";
import { FilterSection } from "../FilterSection";

interface FilterSectionPublicoAlvoProps {
  isOpen: boolean;
  onToggle: (id: string) => void;
  selected: string[];
  onToggleItem: (value: string) => void;
}

export function FilterSectionPublicoAlvo({
  isOpen,
  onToggle,
  selected,
  onToggleItem,
}: FilterSectionPublicoAlvoProps) {
  return (
    <FilterSection
      id="publico"
      title="Público-Alvo"
      icon={<Users className="h-4 w-4" />}
      badge={selected.length}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <ScrollArea className="h-40">
        <div className="space-y-2 pr-3">
          {[...PUBLICO_ALVO].sort((a, b) => a.localeCompare(b)).map((publico) => (
            <div key={publico} className="flex items-center gap-2">
              <Checkbox
                id={`adv-pub-${publico}`}
                checked={selected.includes(publico)}
                onCheckedChange={() => onToggleItem(publico)}
              />
              <Label htmlFor={`adv-pub-${publico}`} className="text-sm cursor-pointer">
                {toTitleCase(publico)}
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </FilterSection>
  );
}
