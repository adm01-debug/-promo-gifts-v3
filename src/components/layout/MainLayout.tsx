import { useState } from "react";
import { Header } from "./Header";
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

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <GlobalCommandBar>
      <div className="min-h-screen bg-background">
        {/* Scroll Progress Indicator */}
        <ScrollProgressIndicator color="primary" height={3} />
        
        {/* Accessibility: Skip links */}
        <SkipToContent />
        
        {/* Global Enhanced Spotlight Search (Cmd+K) */}
        <EnhancedSpotlight />
        
        {/* Onboarding Tour Overlay */}
        <OnboardingTour />
        
        <div className="flex">
          <SidebarReorganized 
            isOpen={sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)} 
          />
          
          <div className="flex-1 flex flex-col min-h-screen">
            <Header 
              onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            
            <main 
              id="main-content" 
              className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 sm:pb-20 lg:pb-6" 
              role="main"
              aria-label="Conteúdo principal"
            >
              {/* Persistent Breadcrumbs */}
              <PersistentBreadcrumbs className="mb-4" />
              
              <PageTransition variant="fade-slide" duration={0.25}>
                {children}
              </PageTransition>
            </main>
            
            {/* Restart Tour Button - fixed position */}
            <div className="fixed bottom-24 sm:bottom-20 lg:bottom-4 left-3 sm:left-4 z-40">
              <RestartTourButton />
            </div>
            
            {/* Expert Chat Button - fixed position, adjusted for mobile nav */}
            <ExpertChatButton />
            
            {/* Quick Quote FAB - Desktop only */}
            <QuickQuoteFAB />
          </div>
        </div>
        
        {/* Scroll to Top Button */}
        <ScrollToTopButton threshold={400} />
        
        {/* Floating Compare Bar */}
        <FloatingCompareBar />
        
        {/* Smart Mobile Bottom Navigation with FAB */}
        <SmartMobileNav />
      </div>
    </GlobalCommandBar>
  );
}
