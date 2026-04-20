import { Heart, Share2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FavoritesSortBar, type FavoritesSort } from "./FavoritesSortBar";
import type { FavoriteList } from "@/hooks/useFavoriteLists";

interface Props {
  list: FavoriteList | null;
  itemCount: number;
  sort: FavoritesSort;
  onSortChange: (s: FavoritesSort) => void;
  /** Texto alternativo quando não há lista remota selecionada (ex: store legado) */
  fallbackTitle?: string;
  fallbackSubtitle?: string;
}

export function FavoritesViewHeader({
  list, itemCount, sort, onSortChange, fallbackTitle, fallbackSubtitle,
}: Props) {
  const color = list?.color ?? "hsl(var(--destructive))";
  const name = list?.name ?? fallbackTitle ?? "Favoritos";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: list ? `${color}20` : undefined, color }}
        >
          <Heart className="h-4 w-4" fill="currentColor" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-display font-semibold text-foreground truncate">
              {name}
            </h2>
            {list?.is_default && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">padrão</Badge>
            )}
            {list?.shared_token && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                <Share2 className="h-2.5 w-2.5" /> compartilhada
              </Badge>
            )}
            {list?.client_name && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                <Users className="h-2.5 w-2.5" /> {list.client_name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "itens"}
            {fallbackSubtitle && ` • ${fallbackSubtitle}`}
          </p>
        </div>
      </div>

      <FavoritesSortBar value={sort} onChange={onSortChange} />
    </div>
  );
}
