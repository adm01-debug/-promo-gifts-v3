import { Skeleton } from "@/components/ui/skeleton";

/** Catalog / Products page skeleton */
export function CatalogSkeleton() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      {/* Toolbar / search */}
      <Skeleton className="h-10 w-full max-w-md" />
      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Product detail page skeleton */
export function ProductDetailSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <Skeleton className="aspect-square w-full rounded-2xl" />
        {/* Info */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-1/3" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 w-40 rounded-lg" />
            <Skeleton className="h-12 w-40 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Quotes list page skeleton */
export function QuotesSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Admin pages skeleton */
export function AdminSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Table */}
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Dashboard / home skeleton */
export function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

/** Orders page skeleton */
export function OrdersSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Generic page skeleton (fallback) */
export function GenericSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="space-y-4 pt-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Returns the appropriate skeleton component based on the current route.
 */
export function getFallback(pathname: string): React.ReactNode {
  if (pathname.startsWith("/produto/")) return <ProductDetailSkeleton />;
  if (pathname === "/produtos" || pathname === "/filtros" || pathname === "/" || pathname === "/novidades" || pathname === "/favoritos")
    return <CatalogSkeleton />;
  if (pathname.startsWith("/orcamentos")) return <QuotesSkeleton />;
  if (pathname.startsWith("/admin") || pathname === "/bi" || pathname === "/status")
    return <AdminSkeleton />;
  if (pathname === "/dashboard") return <DashboardSkeleton />;
  if (pathname.startsWith("/pedidos")) return <OrdersSkeleton />;
  return <GenericSkeleton />;
}
