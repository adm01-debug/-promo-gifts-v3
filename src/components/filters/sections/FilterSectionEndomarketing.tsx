import React from "react";
import { Briefcase } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ENDOMARKETING } from "@/data/mockData";
import { toTitleCase } from "@/lib/textUtils";
import { FilterSection } from "../FilterSection";

interface FilterSectionEndomarketingProps {
  isOpen: boolean;
  onToggle: (id: string) => void;
  selected: string[];
  onToggleItem: (value: string) => void;
}

export function FilterSectionEndomarketing({
  isOpen,
  onToggle,
  selected,
  onToggleItem,
}: FilterSectionEndomarketingProps) {
  return (
    <FilterSection
      id="endomarketing"
      title="Endomarketing"
      icon={<Briefcase className="h-4 w-4" />}
      badge={selected.length}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <ScrollArea className="h-40">
        <div className="space-y-2 pr-3">
          {[...ENDOMARKETING].sort((a, b) => a.localeCompare(b)).map((endo) => (
            <div key={endo} className="flex items-center gap-2">
              <Checkbox
                id={`adv-endo-${endo}`}
                checked={selected.includes(endo)}
                onCheckedChange={() => onToggleItem(endo)}
              />
              <Label htmlFor={`adv-endo-${endo}`} className="text-sm cursor-pointer">
                {toTitleCase(endo)}
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </FilterSection>
  );
}
