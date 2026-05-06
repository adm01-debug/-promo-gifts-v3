import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader that mimics the ProductDetail page layout.
 * Shows during initial product data fetch to reduce perceived loading time.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] animate-fade-in space-y-4 pb-20 md:space-y-6 md:pb-0 xl:space-y-8 xl:px-4 2xl:px-8">
      {/* Intelligence badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Main content grid — matches 5fr / 7fr */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6 xl:gap-8">
        {/* LEFT — Gallery skeleton (sticky area) */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-14 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>

        {/* RIGHT — Product info */}
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Category badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-20 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-xl" />
              <Skeleton className="h-5 w-14 rounded-xl" />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-[85%]" />
              <Skeleton className="h-7 w-[55%]" />
            </div>

            {/* SKU / Supplier bar */}
            <div className="flex gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>

          {/* PRICE + SPECS — two columns */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:gap-4">
            {/* Price card */}
            <div className="space-y-3 rounded-xl border border-border p-3 xl:p-5">
              <div>
                <Skeleton className="mb-2 h-3 w-16" />
                <Skeleton className="h-9 w-32" />
              </div>
              {/* Color swatches */}
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-14 rounded-full" />
                ))}
              </div>
              {/* Info grid */}
              <div className="grid grid-cols-3 gap-1 border-y border-border/40 py-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              {/* CTA buttons */}
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 rounded-xl" />
                <Skeleton className="h-8 flex-1 rounded-xl" />
              </div>
            </div>

            {/* Specs card */}
            <div className="space-y-3 rounded-xl border border-border p-3 xl:p-5">
              <Skeleton className="mb-1 h-4 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[90%]" />
              <Skeleton className="h-3 w-[75%]" />
              <div className="space-y-2 border-t border-border/40 pt-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex flex-wrap gap-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Similar products section */}
      <div className="space-y-3 border-t border-border/60 pt-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-3 w-[50%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
