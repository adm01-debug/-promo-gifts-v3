import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
}

// Base skeleton component
export function Skeleton({ className }: SkeletonLoaderProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-3">
      {/* Image */}
      <Skeleton className="aspect-square w-full rounded-lg" />
      
      {/* Badges */}
      <div className="flex gap-1">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      
      {/* Title */}
      <Skeleton className="h-5 w-3/4" />
      
      {/* SKU */}
      <Skeleton className="h-4 w-1/3" />
      
      {/* Price & Actions */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-20" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Quote Row Skeleton
export function QuoteRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-5 w-20 ml-auto" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  );
}

// Client Card Skeleton
export function ClientCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  );
}

// Stats Card Skeleton
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 p-4 border-b last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                "h-5 flex-1",
                colIndex === 0 && "max-w-[120px]",
                colIndex === columns - 1 && "max-w-[80px]"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Dashboard Grid Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Main Content */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <ClientCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Mockup Generator Skeleton
export function MockupGeneratorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            {i < 3 && <Skeleton className="h-0.5 w-16" />}
          </div>
        ))}
      </div>
      
      {/* Form */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="aspect-square w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
