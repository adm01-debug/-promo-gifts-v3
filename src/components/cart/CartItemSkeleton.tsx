/**
 * CartItemSkeleton - Skeleton loader for cart items
 */
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CartItemSkeleton() {
  return (
    <Card className="overflow-hidden border-border/40 shadow-sm">
      <div className="aspect-square w-full bg-muted/20 relative">
        <Skeleton className="absolute inset-0" />
      </div>
      <div className="p-3.5 space-y-3">
        {/* SKU skeleton */}
        <Skeleton className="h-3.5 w-16 rounded-sm" />
        
        {/* Name skeleton */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        
        {/* Unit Price skeleton */}
        <div className="flex flex-col space-y-1.5 pt-1">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-24" />
        </div>
        
        {/* Footer/Stepper skeleton */}
        <div className="flex items-center justify-between pt-3 border-t border-border/20">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <div className="flex flex-col items-end space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
    </Card>
  );
}
