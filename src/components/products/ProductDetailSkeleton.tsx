import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader that mimics the ProductDetail page layout.
 * Shows during initial product data fetch to reduce perceived loading time.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in pb-20 md:pb-0">
      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-10">
        {/* Left column - Gallery skeleton */}
        <div className="space-y-4">
          <Skeleton className="w-full aspect-square rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-lg shrink-0" />
            ))}
          </div>
        </div>

        {/* Right column - Info skeleton */}
        <div className="space-y-4 md:space-y-6">
          {/* Category badges */}
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-[85%]" />
            <Skeleton className="h-8 w-[60%]" />
          </div>

          {/* SKU / Supplier bar */}
          <div className="flex gap-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-36" />
          </div>

          {/* Price & Stock Card */}
          <div className="rounded-xl md:rounded-2xl border border-border p-4 md:p-6 space-y-4">
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-10 w-32" />
            </div>
            {/* Color swatches */}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-16 rounded-full" />
              ))}
            </div>
            {/* Info grid */}
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[75%]" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-lg" />
            <Skeleton className="h-11 w-11 rounded-lg" />
            <Skeleton className="h-11 w-11 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
