import { useState, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { useScrollLockFix } from "@/hooks/useScrollLockFix";
import { SkipToContent } from "@/components/common/SkipToContent";
import { BackButton } from "@/components/common/BackButton";
import { PersistentBreadcrumbs } from "@/components/common/PersistentBreadcrumbs";

// Lazy load heavy layout components to reduce MainLayout chunk
const Header = lazy(() => import("./Header").then(m => ({ default: m.Header })));
const SidebarReorganized = lazy(() => import("./SidebarReorganized").then(m => ({ default: m.SidebarReorganized })));
const PageTransition = lazy(() => import("@/components/effects/PageTransition").then(m => ({ default: m.PageTransition })));
const SellerCartProvider = lazy(() => import("@/contexts/SellerCartContext").then(m => ({ default: m.SellerCartProvider })));
const OnboardingProvider = lazy(() => import("@/contexts/OnboardingContext").then(m => ({ default: m.OnboardingProvider })));

// Lazy-loaded non-critical UI components
const OnboardingTour = lazy(() => import("@/components/onboarding/OnboardingTour").then(m => ({ default: m.OnboardingTour })));
const ExpertChatButton = lazy(() => import("@/components/expert/ExpertChatButton").then(m => ({ default: m.ExpertChatButton })));
const EnhancedSpotlight = lazy(() => import("@/components/common/EnhancedSpotlight").then(m => ({ default: m.EnhancedSpotlight })));
const SmartMobileNav = lazy(() => import("@/components/mobile/SmartMobileNav").then(m => ({ default: m.SmartMobileNav })));
const QuickQuoteFAB = lazy(() => import("@/components/quote/QuickQuoteFAB").then(m => ({ default: m.QuickQuoteFAB })));
const FloatingCompareBar = lazy(() => import("@/components/compare/FloatingCompareBar").then(m => ({ default: m.FloatingCompareBar })));
const GlobalCommandBar = lazy(() => import("@/components/command/GlobalCommandBar").then(m => ({ default: m.GlobalCommandBar })));
const ScrollToTopButton = lazy(() => import("@/components/common/ScrollProgress").then(m => ({ default: m.ScrollToTopButton })));
const ScrollProgressIndicator = lazy(() => import("@/components/common/ScrollProgress").then(m => ({ default: m.ScrollProgressIndicator })));

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const isMockupGenerator = location.pathname === "/mockup-generator";
  
  useScrollLockFix();

  const layoutContent = (
    <div className="min-h-screen bg-background print:min-h-0">
      <div className="print:hidden">
        <Suspense fallback={null}>
          <ScrollProgressIndicator color="primary" height={3} />
        </Suspense>
      </div>
      
      <div className="print:hidden">
        <SkipToContent />
      </div>
      
      <div className="print:hidden">
        <Suspense fallback={null}>
          <EnhancedSpotlight />
        </Suspense>
      </div>
      
      <div className="print:hidden">
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      </div>
      
      <div className="flex">
        <div className="print:hidden">
          <SidebarReorganized 
            isOpen={sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)} 
          />
        </div>
        
        <div className="flex-1 flex flex-col min-h-screen print:min-h-0">
          <div className="print:hidden">
            <Header 
              onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
          
          <main 
            id="main-content" 
            className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 sm:pb-20 lg:pb-6 print:p-0 print:pb-0" 
            role="main"
            aria-label="Conteúdo principal"
          >
            <div className="print:hidden">
              <BackButton className="mb-1" />
            </div>
            <div className="print:hidden">
              <PersistentBreadcrumbs className="mb-4" />
            </div>
            
            <PageTransition variant="fade-slide" duration={0.25}>
              {children}
            </PageTransition>
          </main>
          
          {!isMockupGenerator && (
            <div className="print:hidden hidden lg:block">
              <Suspense fallback={null}>
                <ExpertChatButton />
              </Suspense>
            </div>
          )}
          
          <div className="print:hidden">
            <Suspense fallback={null}>
              <QuickQuoteFAB />
            </Suspense>
          </div>
        </div>
      </div>
      
      <div className="print:hidden">
        <Suspense fallback={null}>
          <ScrollToTopButton threshold={150} />
        </Suspense>
      </div>
      
      <div className="print:hidden">
        <Suspense fallback={null}>
          <FloatingCompareBar />
        </Suspense>
      </div>
      
      <div className="print:hidden">
        <Suspense fallback={null}>
          <SmartMobileNav />
        </Suspense>
      </div>
    </div>
  );

  return (
    <OnboardingProvider>
      <SellerCartProvider>
        <Suspense fallback={layoutContent}>
          <GlobalCommandBar>
            {layoutContent}
          </GlobalCommandBar>
        </Suspense>
      </SellerCartProvider>
    </OnboardingProvider>
  );
}
