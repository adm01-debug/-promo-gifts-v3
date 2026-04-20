import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Check } from "lucide-react";

export type FavoritesSort =
  | "recent" | "oldest" | "price-asc" | "price-desc"
  | "name-asc" | "name-desc" | "category";

const LABELS: Record<FavoritesSort, string> = {
  "recent": "Recém-adicionados",
  "oldest": "Mais antigos",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  "name-asc": "Nome (A→Z)",
  "name-desc": "Nome (Z→A)",
  "category": "Categoria",
};

interface Props {
  value: FavoritesSort;
  onChange: (s: FavoritesSort) => void;
}

export function FavoritesSortBar({ value, onChange }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="text-xs hidden sm:inline">{LABELS[value]}</span>
          <span className="text-xs sm:hidden">Ordenar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Ordenação</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as FavoritesSort)}>
          {(Object.keys(LABELS) as FavoritesSort[]).map((k) => (
            <DropdownMenuRadioItem key={k} value={k} className="text-xs">
              {LABELS[k]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
