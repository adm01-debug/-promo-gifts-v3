/**
 * FavoritesEmptyStateSmart — Empty state com sugestões dos top 6 produtos
 * mais favoritados nos últimos 7 dias por toda a base de vendedores.
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useProductsContext } from '@/contexts/ProductsContext';
import { formatCurrency } from '@/lib/format';
import { useState } from 'react';
import { toast } from 'sonner';
import { useFavoritesStore } from '@/stores/useFavoritesStore';

interface Props {
  onAddProduct?: (productId: string) => void;
}

export function FavoritesEmptyStateSmart({ onAddProduct }: Props) {
  const navigate = useNavigate();
  const { getProductsByIds } = useProductsContext();
  const { toggleFavorite } = useFavoritesStore();
  const [isMockLoading, setIsMockLoading] = useState(false);

  const { data: topIds = [] } = useQuery({
    queryKey: ['top-favorited-products'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_favorited_products', {
        _days: 7,
        _limit: 6,
      });
      if (error) throw error;
      return (data ?? []).map((r: { product_id: string }) => r.product_id);
    },
    staleTime: 30 * 60 * 1000,
  });

  const products = topIds.length ? getProductsByIds(topIds) : [];

  const handleLoadMocks = async () => {
    setIsMockLoading(true);
    toast.loading('Simulando carga de favoritos...', { id: 'fav-mock' });
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockIds = ['26462', '26463', '26464', '26465'];
      mockIds.forEach((id) => toggleFavorite(id));
      toast.success('Favoritos simulados com sucesso', { id: 'fav-mock' });
    } catch (err) {
      toast.error('Erro na simulação', { id: 'fav-mock' });
    } finally {
      setIsMockLoading(false);
    }
  };

  if (products.length === 0) {
    return (
      <div data-testid="favorites-empty-state" className="flex flex-col items-center gap-6 py-16">
        <div className="w-full max-w-2xl rounded-xl border-[1.5px] border-dashed border-primary/10 bg-muted/20 p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-12 w-12 text-primary/40" />
          <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
            Comece a salvar seus favoritos
          </h3>
          <p className="mx-auto mb-4 max-w-md text-sm text-muted-foreground">
            Explore o catálogo e clique no coração para criar listas curadas para seus clientes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button data-testid="favorites-empty-cta" onClick={() => navigate('/')}>
              Explorar Catálogo
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              disabled={isMockLoading}
              onClick={handleLoadMocks}
              className="border-primary/20 bg-primary/5 text-[11px] font-black uppercase tracking-widest hover:border-primary/50"
            >
              {isMockLoading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-3 w-3 text-primary" />
              )}
              Mock Demo (Engenharia)
            </Button>
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">
          Laboratório de UX / 10.10 Final
        </p>
      </div>
    );
  }

  return (
    <div data-testid="favorites-empty-state" className="space-y-4 py-4">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-foreground">
          Tops da semana — vendedores estão favoritando
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {products.slice(0, 6).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onAddProduct?.(p.id) ?? navigate(`/produto/${p.id}`)}
            className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary hover:shadow-md"
          >
            <div className="aspect-square overflow-hidden bg-muted">
              {p.images?.[0] ? (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Sem imagem
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                {p.name}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-primary">
                {formatCurrency(p.price ?? 0)}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="pt-2 text-center">
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          Ver catálogo completo <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
