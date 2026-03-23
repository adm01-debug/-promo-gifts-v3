/**
 * AppProviders — Consolidates all context providers to reduce nesting in App.tsx.
 * Providers are grouped by domain for clarity and maintainability.
 */
import { ReactNode } from "react";
import { CollectionsProvider } from "@/contexts/CollectionsContext";
import { ComparisonProvider } from "@/contexts/ComparisonContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { RecentlyViewedProvider } from "@/contexts/RecentlyViewedContext";
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
          <ComparisonProvider>
            <FavoritesProvider>
              <RecentlyViewedProvider>
                {children}
              </RecentlyViewedProvider>
            </FavoritesProvider>
          </ComparisonProvider>
        </CollectionsProvider>
      </ProductsProvider>
    </OrganizationProvider>
  );
}
