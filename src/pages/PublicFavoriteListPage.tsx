/**
 * PublicFavoriteListPage — Visualização pública (sem login) de uma lista de favoritos
 * compartilhada via shared_token. Cliente reage com 👍 ❤️ 🔥 💡 por item.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Lock, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useFavoriteReactions } from '@/hooks/useFavoriteReactions';
import { PageSEO } from '@/components/seo/PageSEO';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface PublicList {
  id: string;
  name: string;
  description: string | null;
  color: string;
  shared_expires_at: string | null;
  user_id: string;
}

interface PublicItem {
  id: string;
  product_id: string;
  variant_info: {
    color_name?: string | null;
    color_hex?: string | null;
    thumbnail?: string | null;
  } | null;
  note: string | null;
  added_at: string;
}

const EMOJIS: Array<'👍' | '❤️' | '🔥' | '💡'> = ['👍', '❤️', '🔥', '💡'];

export default function PublicFavoriteListPage() {
  const { token } = useParams<{ token: string }>();

  const {
    data: list,
    isLoading: loadingList,
    error: listError,
  } = useQuery({
    queryKey: ['public-favorite-list', token],
    queryFn: async (): Promise<PublicList | null> => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('favorite_lists')
        .select('id, name, description, color, shared_expires_at, user_id')
        .eq('shared_token', token)
        .maybeSingle();
      if (error) throw error;
      return data as PublicList | null;
    },
    enabled: !!token,
  });

  const expired = useMemo(() => {
    if (!list?.shared_expires_at) return false;
    return new Date(list.shared_expires_at) < new Date();
  }, [list]);

  const { data: items = [] } = useQuery({
    queryKey: ['public-favorite-items', list?.id],
    queryFn: async (): Promise<PublicItem[]> => {
      if (!list) return [];
      const { data, error } = await supabase
        .from('favorite_items')
        .select('id, product_id, variant_info, note, added_at')
        .eq('list_id', list.id)
        .order('position', { ascending: true })
        .order('added_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublicItem[];
    },
    enabled: !!list && !expired,
  });

  // Buscar produtos enriquecidos via edge function (catálogo externo) — fallback simples
  const { data: products = [] } = useQuery({
    queryKey: ['public-favorite-products', items.map((i) => i.product_id).join(',')],
    queryFn: async () => {
      if (items.length === 0) return [];
      const ids = items.map((i) => i.product_id);
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: { action: 'get_products_by_ids', product_ids: ids },
      });
      if (error) return [];
      return (
        ((data?.products ?? []) as Array<{
          id: string;
          name: string;
          price?: number;
          images?: string[];
          sku?: string;
        }>) ?? []
      );
    },
    enabled: items.length > 0,
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const { reactions, react, anonId } = useFavoriteReactions(list?.id ?? null, token ?? null);

  // mapa de reactions por item
  const reactionMap = useMemo(() => {
    const m = new Map<string, { counts: Record<string, number>; mine: Set<string> }>();
    reactions.forEach((r) => {
      const cur = m.get(r.item_id) ?? { counts: {}, mine: new Set<string>() };
      cur.counts[r.emoji] = (cur.counts[r.emoji] ?? 0) + 1;
      if (r.anon_id === anonId) cur.mine.add(r.emoji);
      m.set(r.item_id, cur);
    });
    return m;
  }, [reactions, anonId]);

  // SEO: noindex
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  if (loadingList) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (listError || !list) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <Lock className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-1 font-display text-xl font-semibold text-foreground">
            Lista não encontrada
          </h1>
          <p className="text-sm text-muted-foreground">
            Este link pode ter sido revogado ou está incorreto.
          </p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <Lock className="mx-auto mb-3 h-12 w-12 text-warning" />
          <h1 className="mb-1 font-display text-xl font-semibold text-foreground">Link expirado</h1>
          <p className="text-sm text-muted-foreground">
            Solicite um novo link ao curador desta lista.
          </p>
        </div>
      </div>
    );
  }

  const expiresLabel = list.shared_expires_at
    ? new Date(list.shared_expires_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <PageSEO
        title={`${list.name} — Curadoria`}
        description="Lista de produtos curada para você."
        path={`/lista-publica/${token}`}
      />

      {/* Hero */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${list.color}20`, color: list.color }}
              >
                <Heart className="h-6 w-6" fill="currentColor" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl font-bold text-foreground">
                  {list.name}
                </h1>
                {list.description && (
                  <p className="line-clamp-1 text-sm text-muted-foreground">{list.description}</p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {items.length} produtos selecionados
                  {expiresLabel && ` • Expira em ${expiresLabel}`}
                </p>
              </div>
            </div>
            <div className="self-end text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Promo Gifts • Curadoria
            </div>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Esta lista ainda não tem produtos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const product = productMap.get(item.product_id);
              const meta = reactionMap.get(item.id);
              const img = item.variant_info?.thumbnail || product?.images?.[0];
              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
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
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        Sem imagem
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
                      {product?.name ?? 'Produto indisponível'}
                    </h3>
                    {product?.price !== undefined && (
                      <p className="text-xs font-semibold text-primary">
                        {formatCurrency(product.price)}
                      </p>
                    )}
                    {item.variant_info?.color_name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {item.variant_info.color_hex && (
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: item.variant_info.color_hex }}
                          />
                        )}
                        {item.variant_info.color_name}
                      </div>
                    )}
                    {item.note && (
                      <p className="line-clamp-2 border-l-2 border-primary/30 pl-2 text-[11px] italic text-muted-foreground">
                        ✎ {item.note}
                      </p>
                    )}

                    {/* Reactions */}
                    <div className="flex items-center gap-1 border-t border-border pt-2">
                      {EMOJIS.map((emoji) => {
                        const count = meta?.counts[emoji] ?? 0;
                        const isMine = meta?.mine.has(emoji);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            disabled={isMine || react.isPending}
                            onClick={() => react.mutate({ itemId: item.id, emoji })}
                            className={cn(
                              'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all',
                              'min-h-[32px]',
                              isMine
                                ? 'cursor-default bg-primary/10 text-primary'
                                : 'text-foreground/70 hover:bg-accent',
                            )}
                            aria-label={`Reagir com ${emoji}`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && (
                              <span className="text-[10px] font-medium tabular-nums">{count}</span>
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

      <footer className="mt-12 border-t border-border py-6 text-center">
        <a
          href="https://promogifts.com.br"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Powered by Promo Gifts <ExternalLink className="h-3 w-3" />
        </a>
      </footer>
    </div>
  );
}
