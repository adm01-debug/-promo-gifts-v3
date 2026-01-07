import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MockupSkeletonProps {
  variant?: "config" | "preview" | "result" | "card";
  className?: string;
}

export function MockupSkeleton({
  variant = "config",
  className,
}: MockupSkeletonProps) {
  const shimmerClass = "animate-pulse bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%]";

  if (variant === "config") {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6 space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className={cn("h-6 w-32 rounded", shimmerClass)} />
            <div className={cn("h-4 w-48 rounded", shimmerClass)} />
          </div>

          {/* Select skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className={cn("h-4 w-24 rounded", shimmerClass)} />
              <div className={cn("h-10 w-full rounded-md", shimmerClass)} />
            </div>
          ))}

          {/* Button skeleton */}
          <div className="flex gap-2 pt-4">
            <div className={cn("h-10 flex-1 rounded-md", shimmerClass)} />
            <div className={cn("h-10 w-10 rounded-md", shimmerClass)} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "preview") {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-full", shimmerClass)} />
              <div className="space-y-1.5">
                <div className={cn("h-4 w-32 rounded", shimmerClass)} />
                <div className={cn("h-3 w-24 rounded", shimmerClass)} />
              </div>
            </div>
            <div className={cn("h-8 w-20 rounded", shimmerClass)} />
          </div>

          {/* Image area */}
          <div className={cn("aspect-square rounded-xl", shimmerClass)} />

          {/* Controls */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("h-8 w-16 rounded", shimmerClass)} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "result") {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-full", shimmerClass)} />
              <div className={cn("h-4 w-24 rounded", shimmerClass)} />
            </div>
            <div className={cn("h-8 w-24 rounded", shimmerClass)} />
          </div>

          {/* Image */}
          <div className={cn("aspect-square rounded-xl", shimmerClass)} />

          {/* Info */}
          <div className="flex items-center justify-between">
            <div className={cn("h-6 w-20 rounded-full", shimmerClass)} />
            <div className={cn("h-8 w-32 rounded", shimmerClass)} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Card variant (for history grid)
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <div className={cn("aspect-square", shimmerClass)} />
      <div className="p-3 space-y-2">
        <div className={cn("h-4 w-3/4 rounded", shimmerClass)} />
        <div className={cn("h-3 w-1/2 rounded", shimmerClass)} />
        <div className={cn("h-3 w-1/3 rounded", shimmerClass)} />
      </div>
    </div>
  );
}

// Loading grid for history
export function MockupHistorySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MockupSkeleton key={i} variant="card" />
      ))}
    </div>
  );
}
