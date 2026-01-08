import { useState, useMemo } from "react";
import { Check, ChevronDown, Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ColorNuance {
  id: string;
  name: string;
  hex: string;
}

interface ColorFamily {
  id: string;
  name: string;
  baseHex: string;
  nuances: ColorNuance[];
}

interface ColorFamilyFilterProps {
  colorFamilies?: ColorFamily[];
  selectedColors: string[];
  onColorChange: (colors: string[]) => void;
  className?: string;
}

// Default color families if none provided
const DEFAULT_COLOR_FAMILIES: ColorFamily[] = [
  {
    id: "azul",
    name: "Azul",
    baseHex: "#2563eb",
    nuances: [
      { id: "azul-claro", name: "Azul Claro", hex: "#60a5fa" },
      { id: "azul-royal", name: "Azul Royal", hex: "#1d4ed8" },
      { id: "azul-marinho", name: "Azul Marinho", hex: "#1e3a8a" },
      { id: "azul-turquesa", name: "Azul Turquesa", hex: "#06b6d4" },
    ],
  },
  {
    id: "vermelho",
    name: "Vermelho",
    baseHex: "#dc2626",
    nuances: [
      { id: "vermelho-claro", name: "Vermelho Claro", hex: "#f87171" },
      { id: "vermelho-escuro", name: "Vermelho Escuro", hex: "#991b1b" },
      { id: "bordô", name: "Bordô", hex: "#7f1d1d" },
      { id: "coral", name: "Coral", hex: "#f97316" },
    ],
  },
  {
    id: "verde",
    name: "Verde",
    baseHex: "#16a34a",
    nuances: [
      { id: "verde-claro", name: "Verde Claro", hex: "#4ade80" },
      { id: "verde-escuro", name: "Verde Escuro", hex: "#166534" },
      { id: "verde-limao", name: "Verde Limão", hex: "#84cc16" },
      { id: "verde-agua", name: "Verde Água", hex: "#2dd4bf" },
    ],
  },
  {
    id: "amarelo",
    name: "Amarelo",
    baseHex: "#eab308",
    nuances: [
      { id: "amarelo-claro", name: "Amarelo Claro", hex: "#fde047" },
      { id: "dourado", name: "Dourado", hex: "#ca8a04" },
      { id: "mostarda", name: "Mostarda", hex: "#a16207" },
    ],
  },
  {
    id: "roxo",
    name: "Roxo",
    baseHex: "#9333ea",
    nuances: [
      { id: "lilas", name: "Lilás", hex: "#c084fc" },
      { id: "roxo-escuro", name: "Roxo Escuro", hex: "#6b21a8" },
      { id: "violeta", name: "Violeta", hex: "#7c3aed" },
    ],
  },
  {
    id: "rosa",
    name: "Rosa",
    baseHex: "#ec4899",
    nuances: [
      { id: "rosa-claro", name: "Rosa Claro", hex: "#f9a8d4" },
      { id: "rosa-escuro", name: "Rosa Escuro", hex: "#be185d" },
      { id: "magenta", name: "Magenta", hex: "#d946ef" },
    ],
  },
  {
    id: "laranja",
    name: "Laranja",
    baseHex: "#f97316",
    nuances: [
      { id: "laranja-claro", name: "Laranja Claro", hex: "#fdba74" },
      { id: "laranja-escuro", name: "Laranja Escuro", hex: "#c2410c" },
      { id: "terracota", name: "Terracota", hex: "#9a3412" },
    ],
  },
  {
    id: "neutros",
    name: "Neutros",
    baseHex: "#737373",
    nuances: [
      { id: "branco", name: "Branco", hex: "#ffffff" },
      { id: "preto", name: "Preto", hex: "#171717" },
      { id: "cinza-claro", name: "Cinza Claro", hex: "#d4d4d4" },
      { id: "cinza-escuro", name: "Cinza Escuro", hex: "#525252" },
      { id: "bege", name: "Bege", hex: "#d6d3d1" },
      { id: "marrom", name: "Marrom", hex: "#78350f" },
    ],
  },
];

export function ColorFamilyFilter({
  colorFamilies = DEFAULT_COLOR_FAMILIES,
  selectedColors,
  onColorChange,
  className,
}: ColorFamilyFilterProps) {
  const [open, setOpen] = useState(false);
  const [expandedFamilies, setExpandedFamilies] = useState<string[]>([]);

  const toggleFamily = (familyId: string) => {
    setExpandedFamilies(prev =>
      prev.includes(familyId)
        ? prev.filter(id => id !== familyId)
        : [...prev, familyId]
    );
  };

  const toggleColor = (colorId: string) => {
    onColorChange(
      selectedColors.includes(colorId)
        ? selectedColors.filter(c => c !== colorId)
        : [...selectedColors, colorId]
    );
  };

  const selectFamily = (family: ColorFamily) => {
    const familyColorIds = family.nuances.map(n => n.id);
    const allSelected = familyColorIds.every(id => selectedColors.includes(id));

    if (allSelected) {
      // Deselect all colors in family
      onColorChange(selectedColors.filter(c => !familyColorIds.includes(c)));
    } else {
      // Select all colors in family
      const newColors = [...selectedColors];
      familyColorIds.forEach(id => {
        if (!newColors.includes(id)) newColors.push(id);
      });
      onColorChange(newColors);
    }
  };

  const clearAll = () => {
    onColorChange([]);
  };

  // Get selected color names for display
  const selectedColorNames = useMemo(() => {
    const names: string[] = [];
    colorFamilies.forEach(family => {
      family.nuances.forEach(nuance => {
        if (selectedColors.includes(nuance.id)) {
          names.push(nuance.name);
        }
      });
    });
    return names;
  }, [colorFamilies, selectedColors]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
        >
          <Palette className="h-4 w-4" />
          Cores
          {selectedColors.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedColors.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-medium text-sm">Filtrar por Cores</h4>
          {selectedColors.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 text-xs"
            >
              Limpar
              <X className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>

        <ScrollArea className="h-[320px]">
          <div className="p-2 space-y-1">
            {colorFamilies.map(family => {
              const familyColorIds = family.nuances.map(n => n.id);
              const selectedInFamily = familyColorIds.filter(id =>
                selectedColors.includes(id)
              ).length;
              const allSelected = selectedInFamily === family.nuances.length;

              return (
                <Collapsible
                  key={family.id}
                  open={expandedFamilies.includes(family.id)}
                  onOpenChange={() => toggleFamily(family.id)}
                >
                  <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                    <button
                      onClick={() => selectFamily(family)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        allSelected
                          ? "border-primary bg-primary"
                          : selectedInFamily > 0
                          ? "border-primary/50"
                          : "border-border"
                      )}
                      style={{ backgroundColor: allSelected ? undefined : family.baseHex }}
                    >
                      {allSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </button>

                    <CollapsibleTrigger asChild>
                      <button className="flex-1 flex items-center justify-between text-left">
                        <span className="text-sm font-medium">{family.name}</span>
                        <div className="flex items-center gap-2">
                          {selectedInFamily > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedInFamily}
                            </Badge>
                          )}
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              expandedFamilies.includes(family.id) && "rotate-180"
                            )}
                          />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <div className="pl-10 pr-2 pb-2 grid grid-cols-2 gap-1">
                      {family.nuances.map(nuance => {
                        const isSelected = selectedColors.includes(nuance.id);
                        return (
                          <button
                            key={nuance.id}
                            onClick={() => toggleColor(nuance.id)}
                            className={cn(
                              "flex items-center gap-2 p-1.5 rounded text-left text-sm transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted"
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full border",
                                isSelected ? "ring-2 ring-primary ring-offset-1" : ""
                              )}
                              style={{ backgroundColor: nuance.hex }}
                            />
                            <span className="text-xs truncate">{nuance.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        {/* Selected colors preview */}
        {selectedColors.length > 0 && (
          <div className="p-2 border-t">
            <div className="flex flex-wrap gap-1">
              {selectedColorNames.slice(0, 5).map((name, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
              {selectedColorNames.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedColorNames.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
