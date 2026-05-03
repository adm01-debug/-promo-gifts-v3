/**
 * CartItemSkeleton - Skeleton loader for cart items
 */
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CartItemSkeleton() {
  return (
    <Card className="overflow-hidden border-border/40 shadow-sm animate-pulse">
      <div className="aspect-square w-full bg-muted/20 relative">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute top-2 left-2 h-7 w-7 rounded-lg bg-card/50 backdrop-blur-sm" />
        <div className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-card/50 backdrop-blur-sm" />
      </div>
      <div className="p-3.5 space-y-3">
        <div className="flex flex-col gap-1">
          {/* SKU skeleton */}
          <Skeleton className="h-3.5 w-16 rounded-sm" />
          
          {/* Name skeleton */}
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        
        {/* Unit Price skeleton using standardized layout */}
        <div className="flex flex-col space-y-1.5 pt-1">
          <Skeleton className="h-3 w-14 opacity-60" />
          <Skeleton className="h-5 w-24" />
        </div>
        
        {/* Footer/Stepper skeleton */}
        <div className="flex items-center justify-between pt-3 border-t border-border/20">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <div className="flex flex-col items-end space-y-1.5">
            <Skeleton className="h-3 w-14 opacity-60" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>

        {/* Notes trigger skeleton */}
        <div className="flex items-center gap-1.5 pt-1">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-3 ml-auto" />
        </div>
      </div>
    </Card>
  );
}
