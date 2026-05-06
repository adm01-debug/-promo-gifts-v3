/**
 * PublicCollectionPage — Visualização pública de uma coleção via /colecao-publica/:token
 * Não requer autenticação. Permite reactions anônimas.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Package, Heart, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface PublicCollection {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_color: string | null;
  client_name: string | null;
  share_expires_at: string | null;
}

interface PublicItem {
  id: string;
  product_id: string;
  color_name: string | null;
  color_hex: string | null;
  thumbnail_url: string | null;
  notes: string | null;
}

interface ProductDetail {
  id: string;
  name: string;
  price: number | null;
  images: string[] | null;
  sku: string | null;
}

const EMOJIS = ['👍', '❤️', '🔥', '💡'] as const;

function getOrCreateAnonId(): string {
  const KEY = 'pg_anon_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '');
    localStorage.setItem(KEY, id);
  }
  return id;
}

export default function PublicCollectionPage() {
  const { token } = useParams<{ token: string }>();
  const [collection, setCollection] = useState<PublicCollection | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [products, setProducts] = useState<Map<string, ProductDetail>>(new Map());
  const [reactions, setReactions] = useState<Map<string, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const anonId = useMemo(() => getOrCreateAnonId(), []);

  useEffect(() => {
    if (!token) {
      setError('Token inválido');
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data: col, error: colErr } = await supabase
        .from('collections')
        .select('id, name, description, icon, icon_color, client_name, share_expires_at, is_public')
        .eq('share_token', token)
        .maybeSingle();

      if (!mounted) return;
      if (colErr || !col || !col.is_public) {
        setError('Coleção não encontrada ou link inválido.');
        setLoading(false);
        return;
      }
      if (col.share_expires_at && new Date(col.share_expires_at) < new Date()) {
        setError('Este link expirou.');
        setLoading(false);
        return;
      }

      setCollection(col as PublicCollection);

      const { data: itemRows } = await supabase
        .from('collection_items')
        .select('id, product_id, color_name, color_hex, thumbnail_url, notes, sort_order')
        .eq('collection_id', col.id)
        .order('sort_order', { ascending: true });

      const its = (itemRows ?? []) as (PublicItem & { sort_order: number })[];
      setItems(its);

      // Produtos
      const productIds = its.map((i) => i.product_id);
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, name, price, images, sku')
          .in('id', productIds);
        const pMap = new Map<string, ProductDetail>();
        (prods ?? []).forEach((p: ProductDetail) => pMap.set(p.id, p));
        setProducts(pMap);
      }

      // Reações
      const itemIds = its.map((i) => i.id);
      if (itemIds.length > 0) {
        const { data: reacts } = await supabase
          .from('collection_item_reactions')
          .select('item_id, emoji')
          .in('item_id', itemIds);
        const rMap = new Map<string, Map<string, number>>();
        (reacts ?? []).forEach((r: { item_id: string; emoji: string }) => {
          if (!rMap.has(r.item_id)) rMap.set(r.item_id, new Map());
          const m = rMap.get(r.item_id)!;
          m.set(r.emoji, (m.get(r.emoji) ?? 0) + 1);
        });
        setReactions(rMap);
      }

      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  const sendReaction = async (itemId: string, emoji: string) => {
    if (!token) return;
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/collections-public-react`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: token, item_id: itemId, emoji, anon_id: anonId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) toast.error('Muitas reações em pouco tempo. Aguarde um instante.');
        else toast.error(body.error || 'Falha ao reagir');
        return;
      }
      // optimistic update
      setReactions((prev) => {
        const next = new Map(prev);
        const m = new Map(next.get(itemId) ?? new Map<string, number>());
        m.set(emoji, (m.get(emoji) ?? 0) + 1);
        next.set(itemId, m);
        return next;
      });
      toast.success('Obrigado pelo feedback!');
    } catch {
      toast.error('Erro de conexão');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 font-display text-2xl font-bold">Link indisponível</h1>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <a href="/">Ir para o início</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{collection.name} — Coleção compartilhada</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: `${collection.icon_color ?? '#8B5CF6'}20` }}
          >
            {collection.icon ?? '📁'}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="truncate text-sm text-muted-foreground">{collection.description}</p>
            )}
            {collection.client_name && (
              <p className="mt-0.5 text-xs font-medium text-primary">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Curadoria para {collection.client_name}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Items */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            Esta coleção ainda não tem produtos.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const product = products.get(item.product_id);
              const img = item.thumbnail_url || product?.images?.[0];
              const reactionMap = reactions.get(item.id);
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    {img ? (
                      <img
                        src={img}
                        alt={product?.name ?? 'Produto'}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="line-clamp-2 text-sm font-medium leading-tight">
                      {product?.name ?? 'Produto'}
                    </h3>
                    {product?.price ? (
                      <p className="font-display text-lg font-bold text-primary">
                        {formatCurrency(product.price)}
                      </p>
                    ) : null}
                    {item.color_name && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {item.color_hex && (
                          <span
                            className="h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: item.color_hex }}
                          />
                        )}
                        {item.color_name}
                      </p>
                    )}
                    {item.notes && (
                      <p className="border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">
                        ✎ {item.notes}
                      </p>
                    )}
                    <div className="mt-auto flex items-center gap-1 border-t border-border pt-2">
                      {EMOJIS.map((e) => {
                        const count = reactionMap?.get(e) ?? 0;
                        return (
                          <button
                            key={e}
                            type="button"
                            onClick={() => sendReaction(item.id, e)}
                            className="flex items-center gap-0.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent"
                            aria-label={`Reagir com ${e}`}
                          >
                            <span>{e}</span>
                            {count > 0 && (
                              <span className="text-[10px] tabular-nums text-muted-foreground">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <Heart className="mr-1 inline h-3 w-3 text-primary" />
        Coleção compartilhada via Promo Gifts
      </footer>
    </div>
  );
}
