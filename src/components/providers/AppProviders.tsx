/**
 * AppProviders — Consolidates all context providers to reduce nesting in App.tsx.
 * Providers are grouped by domain for clarity and maintainability.
 * 
 * NOTE: Comparison, Favorites, and RecentlyViewed have been migrated to Zustand stores
 * and no longer need providers. Their context files export no-op providers for compat.
 */
import { ReactNode } from "react";
import { CollectionsProvider } from "@/contexts/CollectionsContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Wraps children with domain-specific providers.
 * Auth, Theme, Accessibility and Query providers remain external
 * because they have different lifecycles.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <OrganizationProvider>
      <ProductsProvider>
        <CollectionsProvider>
          {children}
        </CollectionsProvider>
      </ProductsProvider>
    </OrganizationProvider>
  );
}
