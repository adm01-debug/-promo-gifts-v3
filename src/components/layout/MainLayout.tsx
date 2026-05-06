import { useState, Suspense, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useScrollLockFix } from '@/hooks/useScrollLockFix';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { SkipToContent } from '@/components/common/SkipToContent';
import { BackButton } from '@/components/common/BackButton';

import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Lazy load heavy layout components to reduce MainLayout chunk size
const Header = lazyWithRetry(() => import('./Header').then((m) => ({ default: m.Header })));
const SidebarReorganized = lazyWithRetry(() =>
  import('./SidebarReorganized').then((m) => ({ default: m.SidebarReorganized })),
);
const PageTransition = lazyWithRetry(() =>
  import('@/components/effects/PageTransition').then((m) => ({ default: m.PageTransition })),
);

// Context providers must be imported synchronously (consumers render inside them)
import { SellerCartProvider } from '@/contexts/SellerCartContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

import { GlobalOverlay } from './GlobalOverlay';
const GlobalCommandBar = lazyWithRetry(() =>
  import('@/components/command/GlobalCommandBar').then((m) => ({ default: m.GlobalCommandBar })),
);
const PersistentBreadcrumbs = lazyWithRetry(() =>
  import('@/components/common/PersistentBreadcrumbs').then((m) => ({
    default: m.PersistentBreadcrumbs,
  })),
);
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDebouncingSearch, setIsDebouncingSearch] = useState(false);
  const location = useLocation();
  const isMockupGenerator = location.pathname === '/mockup-generator';
  const isHome = location.pathname === '/';

  useScrollLockFix();
  useGlobalShortcuts();

  // Propaga --breadcrumb-h ao :root para que stickys filhos (toolbars de
  // página) ancorem corretamente abaixo do Header + Breadcrumb. Em "/" a
  // breadcrumb-bar fica oculta → 0px.
  useEffect(() => {
    document.documentElement.style.setProperty('--breadcrumb-h', isHome ? '0px' : '40px');
  }, [isHome]);

  // Focus management: move focus to main content on route changes for screen readers
  const mainRef = useRef<HTMLElement>(null);
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      // Delay to allow page transition animation to start
      const timer = setTimeout(() => {
        mainRef.current?.focus({ preventScroll: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const layoutContent = useMemo(
    () => (
      <div className="min-h-screen bg-background print:min-h-0" role="document">
        <GlobalOverlay />
        <div className="print:hidden">
          <SkipToContent />
        </div>

        <div className="flex">
          <div className="print:hidden">
            <Suspense fallback={<div className="hidden h-screen w-64 flex-shrink-0 lg:block" />}>
              <SidebarReorganized
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
              />
            </Suspense>
          </div>

          <div className="isolate flex min-h-screen min-w-0 flex-1 flex-col print:min-h-0">
            <Suspense fallback={<div style={{ height: 56 }} className="print:hidden" />}>
              <Header
                onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                  setSearchQuery(q);
                  if (location.pathname === '/filtros') {
                    setIsDebouncingSearch(true);
                    setTimeout(() => setIsDebouncingSearch(false), 300);
                  }
                }}
                isFiltering={
                  (location.pathname === '/filtros' || isDebouncingSearch) &&
                  (window as any).__IS_FILTERING_GLOBAL__
                }
              />
            </Suspense>

            <div
              aria-hidden="true"
              className="shrink-0 print:hidden"
              style={{ height: 'var(--header-h, 56px)' }}
            />

            <div
              className={cn(
                'sticky z-[10] transition-all duration-300 print:hidden',
                'bg-background/85 backdrop-blur-md',
                'border-b border-border/40',
                isHome && 'hidden',
              )}
              style={{ top: 'var(--header-h, 56px)' }}
              data-testid="breadcrumb-bar"
            >
              <div className="mx-auto max-w-[1920px] px-3 py-2 sm:px-4 lg:px-6">
                <Suspense fallback={<div className="h-6" />}>
                  <PersistentBreadcrumbs showBackButton />
                </Suspense>
              </div>
            </div>

            <main
              ref={mainRef}
              tabIndex={-1}
              id="main-content"
              className="flex-1 overflow-x-clip p-3 pb-24 outline-none sm:p-4 sm:pb-20 lg:p-6 lg:pb-6 print:p-0 print:pb-0"
              role="main"
              aria-label="Conteúdo principal"
            >
              <PageTransition variant="fade-slide" duration={0.2}>
                {children}
              </PageTransition>
            </main>
          </div>
        </div>
      </div>
    ),
    [sidebarOpen, searchQuery, isDebouncingSearch, location.pathname, isHome, children],
  );

  return (
    <OnboardingProvider>
      <SellerCartProvider>
        <Suspense fallback={layoutContent}>
          <GlobalCommandBar>{layoutContent}</GlobalCommandBar>
        </Suspense>
      </SellerCartProvider>
    </OnboardingProvider>
  );
}
