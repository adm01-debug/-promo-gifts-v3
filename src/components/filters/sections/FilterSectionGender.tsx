import React from "react";
import { Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FilterSection } from "../FilterSection";

const GENDER_OPTIONS = [
  { value: "unissex", label: "Unissex" },
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "infantil", label: "Infantil" },
];

interface FilterSectionGenderProps {
  isOpen: boolean;
  onToggle: (id: string) => void;
  selected: string[];
  onToggleItem: (value: string) => void;
}

export function FilterSectionGender({
  isOpen,
  onToggle,
  selected,
  onToggleItem,
}: FilterSectionGenderProps) {
  return (
    <FilterSection
      id="genero"
      title="Gênero"
      icon={<Users className="h-4 w-4" />}
      badge={selected.length}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        {GENDER_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={`adv-gender-${option.value}`}
              checked={selected.includes(option.value)}
              onCheckedChange={() => onToggleItem(option.value)}
            />
            <Label htmlFor={`adv-gender-${option.value}`} className="text-sm cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </FilterSection>
  );
}
