import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { CollectionsProvider } from "@/contexts/CollectionsContext";
import { GamificationProvider } from "@/contexts/GamificationContext";
import { ComparisonProvider } from "@/contexts/ComparisonContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import LoadingScreen from "@/components/LoadingScreen";
import "./App.css";

// Auth Pages
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Index = lazy(() => import("./pages/Index"));
const PublicQuoteApproval = lazy(() => import("./pages/PublicQuoteApproval"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Product Pages
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const FiltersPage = lazy(() => import("./pages/FiltersPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/CollectionDetailPage"));

// Client Pages
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ClientList = lazy(() => import("./pages/ClientList"));

// Quote Pages
const QuoteTemplatesPage = lazy(() => import("./pages/QuoteTemplatesPage"));
const QuotesListPage = lazy(() => import("./pages/QuotesListPage"));
const QuotesDashboardPage = lazy(() => import("./pages/QuotesDashboardPage"));
const QuoteBuilderPage = lazy(() => import("./pages/QuoteBuilderPage"));
const QuoteViewPage = lazy(() => import("./pages/QuoteViewPage"));
const QuotesKanbanPage = lazy(() => import("./pages/QuotesKanbanPage"));

// Order Pages
const OrdersListPage = lazy(() => import("./pages/OrdersListPage"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"));

// Admin Pages
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AdminPersonalizationPage = lazy(() => import("./pages/AdminPersonalizationPage"));

// Tools Pages
const PersonalizationSimulator = lazy(() => import("./pages/PersonalizationSimulator"));
const MockupGenerator = lazy(() => import("./pages/MockupGenerator"));
const MagicUp = lazy(() => import("./pages/MagicUp"));

// User Pages
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

// Bitrix Integration
const BitrixSync = lazy(() => import("./pages/BitrixSyncPage"));

// Analytics Pages
const BIDashboard = lazy(() => import("./pages/BIDashboard"));
const TrendsPage = lazy(() => import("./pages/TrendsPage"));

// Gamification Pages
const StoreRewardsPage = lazy(() => import("./pages/RewardsStorePage"));

// System Pages
const SystemStatusPage = lazy(() => import("./pages/SystemStatusPage"));
const RateLimitDashboard = lazy(() => import("./pages/RateLimitDashboardPage"));

// Security Pages
const SecurityPage = lazy(() => import("./pages/Security"));

// Admin - Roles & Permissions
const PermissionsPage = lazy(() => import("./pages/PermissionsPage"));
const RolesPage = lazy(() => import("./pages/RolesPage"));
const RolePermissionsPage = lazy(() => import("./pages/RolePermissionsPage"));

// Dashboard
const CustomizableDashboard = lazy(() => import("./pages/CustomizableDashboard"));

// Auth Callbacks
const SSOCallbackPage = lazy(() => import("./pages/SSOCallbackPage"));

const queryClient = new QueryClient();

const App = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <ProductsProvider>
              <CollectionsProvider>
                <GamificationProvider>
                <ComparisonProvider>
                  <FavoritesProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Suspense fallback={<LoadingScreen />}>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Auth />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/approve/:token" element={<PublicQuoteApproval />} />
                        <Route path="/auth/callback" element={<SSOCallbackPage />} />

                        {/* Protected Routes */}
                        <Route
                          path="/*"
                          element={
                            <ProtectedRoute>
                              <Routes>
                                {/* Home */}
                                <Route path="/" element={<Index />} />
                                <Route path="/dashboard" element={<CustomizableDashboard />} />

                                {/* Products */}
                                <Route path="/produto/:id" element={<ProductDetail />} />
                                <Route path="/filtros" element={<FiltersPage />} />
                                <Route path="/favoritos" element={<FavoritesPage />} />
                                <Route path="/comparar" element={<ComparePage />} />
                                <Route path="/colecoes" element={<CollectionsPage />} />
                                <Route path="/colecoes/:id" element={<CollectionDetailPage />} />

                                {/* Clients */}
                                <Route path="/clientes" element={<ClientList />} />
                                <Route path="/clientes/:id" element={<ClientDetail />} />

                                {/* Quotes */}
                                <Route path="/orcamentos" element={<QuotesListPage />} />
                                <Route path="/orcamentos/dashboard" element={<QuotesDashboardPage />} />
                                <Route path="/orcamentos/lista" element={<QuotesListPage />} />
                                <Route path="/orcamentos/kanban" element={<QuotesKanbanPage />} />
                                <Route path="/orcamentos/templates" element={<QuoteTemplatesPage />} />
                                <Route path="/orcamentos/novo" element={<QuoteBuilderPage />} />
                                <Route path="/orcamentos/:id/editar" element={<QuoteBuilderPage />} />
                                <Route path="/orcamentos/:id" element={<QuoteViewPage />} />

                                {/* Orders */}
                                <Route path="/pedidos" element={<OrdersListPage />} />
                                <Route path="/pedidos/:id" element={<OrderDetailPage />} />

                                {/* Admin */}
                                <Route path="/admin" element={<AdminPanel />} />
                                <Route path="/admin/personalizacao" element={<AdminPersonalizationPage />} />
                                <Route path="/admin/permissoes" element={<PermissionsPage />} />
                                <Route path="/admin/roles" element={<RolesPage />} />
                                <Route path="/admin/role-permissoes" element={<RolePermissionsPage />} />
                                <Route path="/admin/rate-limit" element={<RateLimitDashboard />} />
                          
                                {/* Tools Routes */}
                                <Route path="/simulador" element={<PersonalizationSimulator />} />
                                <Route path="/mockup" element={<Navigate to="/mockup-generator" replace />} />
                                <Route path="/mockup-generator" element={<MockupGenerator />} />
                                <Route path="/magic-up" element={<MagicUp />} />
                          
                                {/* User Routes */}
                                <Route path="/perfil" element={<ProfilePage />} />
                                <Route path="/seguranca" element={<SecurityPage />} />

                                {/* Bitrix */}
                                <Route path="/bitrix-sync" element={<BitrixSync />} />

                                {/* Analytics */}
                                <Route path="/bi" element={<BIDashboard />} />
                                <Route path="/tendencias" element={<TrendsPage />} />

                                {/* Gamification */}
                                <Route path="/loja-recompensas" element={<StoreRewardsPage />} />

                                {/* System */}
                                <Route path="/status" element={<SystemStatusPage />} />

                                {/* Fallback */}
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </ProtectedRoute>
                          }
                        />
                      </Routes>
                    </Suspense>
                  </BrowserRouter>
                  {/* <Analytics /> */}
                    </FavoritesProvider>
                  </ComparisonProvider>
                </GamificationProvider>
              </CollectionsProvider>
            </ProductsProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
