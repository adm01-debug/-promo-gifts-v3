import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { useScrollLockFix } from "@/hooks/useScrollLockFix";
import { SidebarReorganized } from "./SidebarReorganized";
import { PageTransition } from "@/components/effects";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { RestartTourButton } from "@/components/onboarding/RestartTourButton";
import { ExpertChatButton } from "@/components/expert/ExpertChatButton";
import { SkipToContent } from "@/components/common/SkipToContent";
import { EnhancedSpotlight } from "@/components/common/EnhancedSpotlight";
import { SmartMobileNav } from "@/components/mobile/SmartMobileNav";
import { QuickQuoteFAB } from "@/components/quote/QuickQuoteFAB";
import { FloatingCompareBar } from "@/components/compare/FloatingCompareBar";
import { GlobalCommandBar } from "@/components/command/GlobalCommandBar";
import { ScrollToTopButton, ScrollProgressIndicator } from "@/components/common/ScrollProgress";
import { PersistentBreadcrumbs } from "@/components/common/PersistentBreadcrumbs";
import { BackButton } from "@/components/common/BackButton";
import { SellerCartProvider } from "@/contexts/SellerCartContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const isMockupGenerator = location.pathname === "/mockup-generator";
  
  // Prevent Radix modals from permanently locking page scroll
  useScrollLockFix();

  return (
    <OnboardingProvider>
    <SellerCartProvider>
    <GlobalCommandBar>
      <div className="min-h-screen bg-background print:min-h-0">
        {/* Scroll Progress Indicator */}
        <div className="print:hidden">
          <ScrollProgressIndicator color="primary" height={3} />
        </div>
        
        {/* Accessibility: Skip links */}
        <div className="print:hidden">
          <SkipToContent />
        </div>
        
        {/* Global Enhanced Spotlight Search (Cmd+K) */}
        <div className="print:hidden">
          <EnhancedSpotlight />
        </div>
        
        {/* Onboarding Tour Overlay */}
        <div className="print:hidden">
          <OnboardingTour />
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
              {/* Back Button + Breadcrumbs */}
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
            
            {/* Restart Tour Button - positioned to avoid sidebar footer collision */}
            <div className="fixed bottom-4 left-[270px] z-40 print:hidden hidden lg:block">
              <RestartTourButton />
            </div>
            
            {/* Expert Chat Button - hidden on mobile and on mockup generator (has its own assistant) */}
            {!isMockupGenerator && (
              <div className="print:hidden hidden lg:block">
                <ExpertChatButton />
              </div>
            )}
            
            {/* Quick Quote FAB - Desktop only */}
            <div className="print:hidden">
              <QuickQuoteFAB />
            </div>
          </div>
        </div>
        
        {/* Scroll to Top Button - adjusted position for mobile nav */}
        <div className="print:hidden">
          <ScrollToTopButton threshold={150} />
        </div>
        
        {/* Floating Compare Bar */}
        <div className="print:hidden">
          <FloatingCompareBar />
        </div>
        
        {/* Smart Mobile Bottom Navigation with FAB */}
        <div className="print:hidden">
          <SmartMobileNav />
        </div>
      </div>
    </GlobalCommandBar>
    </SellerCartProvider>
    </OnboardingProvider>
  );
}
