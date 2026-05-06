import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton para ProductListItem — espelha o layout horizontal compacto.
 * Thumb 56-72px | Info (meta + nome + stock) | Preço | Actions
 */
export function ProductListItemSkeleton() {
  return (
    <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border/40 bg-card px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
      {/* Shimmer overlay */}
      <div className="bg-shimmer pointer-events-none absolute inset-0 animate-shimmer" />

      {/* Thumbnail */}
      <Skeleton className="h-14 w-14 shrink-0 rounded-xl bg-muted/40 sm:h-[72px] sm:w-[72px]" />

      {/* Info block */}
      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        {/* Meta: category + supplier */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-16 opacity-50" />
          <Skeleton className="h-3 w-12 opacity-40" />
        </div>
        {/* Name */}
        <Skeleton className="h-4 w-3/5 opacity-80" />
        {/* Stock + SKU */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24 opacity-50" />
          <Skeleton className="hidden h-3 w-12 opacity-30 sm:block" />
        </div>
      </div>

      {/* Price */}
      <div className="min-w-[80px] shrink-0 text-right sm:min-w-[100px]">
        <Skeleton className="ml-auto h-5 w-16 opacity-70" />
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <Skeleton className="h-7 w-7 rounded-full opacity-40" />
        <Skeleton className="h-7 w-7 rounded-full opacity-40" />
        <Skeleton className="hidden h-7 w-7 rounded-full opacity-40 sm:block" />
      </div>
    </div>
  );
}

export function ProductListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 will-change-transform">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="" style={{ animationDelay: `${i * 60}ms` }}>
          <ProductListItemSkeleton />
        </div>
      ))}
    </div>
  );
}
