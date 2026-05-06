import { useEffect, type CSSProperties } from 'react';
import {
  User,
  Menu,
  Sun,
  Moon,
  Heart,
  GitCompare,
  Search,
  LogOut,
  Settings,
  HelpCircle,
  Shield,
  MoreHorizontal,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useComparisonStore } from '@/stores/useComparisonStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingContext } from '@/contexts/OnboardingContext';

import { StockAlertsIndicator } from '@/components/inventory/StockAlertsIndicator';
import { NotificationBell } from '@/components/notifications/NotificationDrawer';
import { DiscountApprovalHeaderBadge } from '@/components/admin/DiscountApprovalHeaderBadge';

import { GlobalSearchPalette } from '@/components/search/GlobalSearchPalette';
import { CartHeaderButton } from '@/components/cart/CartHeaderButton';
import { useIsScrolled } from '@/hooks/useScroll';
import { useCurrentSection } from '@/hooks/useCurrentSection';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roles';
import { RoleBadge } from '@/components/RoleBadge';
import { prefetchRoute } from '@/lib/routePrefetch';

interface HeaderProps {
  onMenuToggle: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isFiltering?: boolean;
}

export function Header({
  onMenuToggle,
  searchQuery,
  onSearchChange,
  isFiltering = false,
}: HeaderProps) {
  const { theme, actualTheme, setTheme, toggleTheme, isFallback } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const favoriteCount = useFavoritesStore((s) => s.favoriteCount);
  const compareCount = useComparisonStore((s) => s.compareCount);
  const { user, profile, role, isAdmin, signOut, rolesLoaded } = useAuth();
  const currentSection = useCurrentSection();
  const { restartTour, hasCompletedTour, isLoading: onboardingLoading } = useOnboardingContext();

  const isScrolled = useIsScrolled(20);

  // Altura dinâmica do Header (px). Usada como --header-h para que stickys
  // filhos (breadcrumb, toolbars de catálogo) ancorem corretamente abaixo
  // do header em qualquer estado (compactado ou expandido).
  const headerHeightPx = isScrolled ? 56 : 56; // Mantendo fixo para evitar saltos de layout no main-content

  // Propaga --header-h ao :root para que stickys fora da árvore do Header
  // (ex.: dentro de <main>) também leiam o valor atual.
  useEffect(() => {
    document.documentElement.style.setProperty('--header-h', `${headerHeightPx}px`);
  }, [headerHeightPx]);

  // Mantém --header-left em sincronia com o breakpoint desktop (lg = 1024px)
  // e a largura atual da sidebar (--sidebar-w). Em telas <lg, a sidebar é
  // off-canvas, então --header-left = 0.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      const sidebarW =
        getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w').trim() ||
        '16rem';
      document.documentElement.style.setProperty('--header-left', mq.matches ? sidebarW : '0px');
    };
    apply();
    mq.addEventListener('change', apply);
    // Observa mudanças no atributo style do <html> (quando sidebar atualiza --sidebar-w)
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => {
      mq.removeEventListener('change', apply);
      obs.disconnect();
    };
  }, []);

  const handleToggleTheme = () => {
    if (theme === 'auto') {
      setTheme(actualTheme === 'dark' ? 'light' : 'dark');
      return;
    }
    toggleTheme();
  };

  const handleSignOut = async () => {
    try {
      // Mostra toast imediato de processamento se desejar, ou apenas aguarda
      await signOut();
      toast({
        title: 'Até logo!',
        description: 'Você saiu da sua conta com segurança.',
      });
    } catch (err) {
      console.error('[Header] signOut error:', err);
      toast({
        variant: 'destructive',
        title: 'Aviso',
        description:
          'Sessão encerrada localmente, mas houve um erro ao sincronizar com o servidor.',
      });
    } finally {
      // Força redirect para a página de login correta
      navigate('/login', { replace: true });
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const roleLabel = getRoleLabel(role);

  // #10 — Truncate inteligente: "Joaquim Ataides" → "Joaquim A."
  const truncatedName = (() => {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length <= 1) return displayName;
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  })();

  return (
    <header
      role="banner"
      data-testid="app-header"
      style={
        {
          '--header-h': `${headerHeightPx}px`,
          left: 'var(--header-left, 0px)',
        } as CSSProperties
      }
      className={cn(
        'fixed right-0 top-0 z-[20] border-b transition-all duration-300 print:hidden',
        'border-border bg-card/95 backdrop-blur-md',
        'h-[var(--header-h)]',
        isScrolled && 'bg-card/98 border-border/80 shadow-md backdrop-blur-lg',
      )}
    >
      <div className="flex h-full items-center justify-between px-2 sm:px-4 lg:px-6">
        {/* ══════ Left section — Menu + Âncora contextual (#1) ══════ */}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary sm:h-9 sm:w-9 lg:hidden"
                  onClick={onMenuToggle}
                  aria-label="Abrir menu"
                >
                  <div className="rounded-xl bg-primary/10 p-2">
                    <Menu className="h-5 w-5 text-primary" />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl"
              >
                <span aria-label="Navegação lateral (atalho Alt mais B)">
                  Navegação lateral{' '}
                  <kbd
                    className="ml-1.5 rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] text-primary-foreground"
                    aria-hidden="true"
                  >
                    Alt+B
                  </kbd>
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* #1 — Seção atual como âncora */}
          <div className="hidden items-center gap-2 lg:flex">
            <span
              className="max-w-[160px] truncate font-display text-sm font-semibold tracking-tight text-foreground"
              key={currentSection}
            >
              {currentSection}
            </span>
          </div>
        </div>

        {/* ══════ Center section — Global Search (#4 expandida) ══════ */}
        <div className="mx-4 hidden max-w-lg flex-1 md:block" data-tour="search">
          <GlobalSearchPalette />
        </div>

        {/* ══════ Right section — Agrupamento em clusters (#2) ══════ */}
        <div className="flex items-center gap-0.5 sm:gap-0.5">
          {isFallback && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mr-2 flex animate-pulse items-center gap-1 rounded border border-amber-200 bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-800">
                    <Shield className="h-3 w-3" />
                    <span className="hidden sm:inline">Theme Safe-Mode</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                  O ThemeProvider não foi detectado. O sistema está rodando em modo de segurança com
                  o tema padrão.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Mobile search trigger */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ativar busca global"
                  data-testid="header-mobile-search-trigger"
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary md:hidden"
                  onClick={() => {
                    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
                    document.dispatchEvent(event);
                  }}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl"
              >
                <span aria-label="Busca rápida (atalho Control mais K)">
                  Busca rápida{' '}
                  <kbd
                    className="ml-1 rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] text-primary-foreground"
                    aria-hidden="true"
                  >
                    Ctrl+K
                  </kbd>
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* ── Cluster 1: Transacional (carrinho, notificações, alertas) ── */}
          <div className="flex items-center gap-0.5">
            <CartHeaderButton />
            <DiscountApprovalHeaderBadge />
            <NotificationBell />
            <div className="hidden md:block">
              <StockAlertsIndicator />
            </div>
          </div>

          {/* Divider entre clusters (#2) */}
          <div className="mx-1.5 hidden h-5 w-px bg-border/60 md:block" />

          {/* ── Cluster 2: Utilitário (filtros, favoritos, comparar, tema) — desktop only ── */}
          <div className="hidden items-center gap-0.5 md:flex">
            {/* #12 — Super Filtro Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Super Filtro"
                    className={cn(
                      'relative h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:text-foreground',
                      isFiltering
                        ? 'animate-pulse bg-primary/20 text-primary'
                        : 'hover:bg-primary/10',
                    )}
                    onClick={() => navigate('/filtros')}
                    onMouseEnter={() => prefetchRoute('/filtros')}
                  >
                    {isFiltering ? (
                      <Loader2 className="h-[17px] w-[17px] animate-spin" />
                    ) : (
                      <SlidersHorizontal className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                  <span aria-label="Super Filtro (atalho Alt mais F)">
                    Super Filtro{' '}
                    <kbd
                      className="ml-1.5 rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] text-primary-foreground"
                      aria-hidden="true"
                    >
                      Alt+F
                    </kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* #5 — Tooltip com atalho atualizado para Alt+V */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Favoritar"
                    className="relative h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-foreground"
                    onClick={() => navigate('/favoritos')}
                    onMouseEnter={() => prefetchRoute('/favoritos')}
                  >
                    <Heart className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    {favoriteCount > 0 && (
                      <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center border-0 bg-orange px-1 text-[9px] text-orange-foreground">
                        {favoriteCount > 99 ? '99+' : favoriteCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                  <span aria-label="Favoritos (atalho Alt mais V)">
                    Favoritos{' '}
                    <kbd
                      className="ml-1.5 rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] text-primary-foreground"
                      aria-hidden="true"
                    >
                      Alt+V
                    </kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Comparar produtos"
                    className="relative h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-foreground"
                    onClick={() => navigate('/comparar')}
                    onMouseEnter={() => prefetchRoute('/comparar')}
                  >
                    <GitCompare className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    {compareCount > 0 && (
                      <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center border-0 bg-orange px-1 text-[9px] text-orange-foreground">
                        {compareCount > 4 ? '4' : compareCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                  <span aria-label="Comparar produtos (atalho Alt mais C)">
                    Comparar{' '}
                    <kbd
                      className="ml-1.5 rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] text-primary-foreground"
                      aria-hidden="true"
                    >
                      Alt+C
                    </kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleTheme}
                    className="relative h-8 w-8 rounded-full text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-foreground"
                    aria-label="Tema claro"
                  >
                    <Sun
                      className="h-[17px] w-[17px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                      strokeWidth={1.75}
                    />
                    <Moon
                      className="absolute h-[17px] w-[17px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                      strokeWidth={1.75}
                    />
                    <span className="sr-only">Alternar tema</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                  <span
                    aria-label={`${actualTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'} (atalho Alt mais T)`}
                  >
                    {actualTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}{' '}
                    <kbd
                      className="ml-1.5 rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] text-primary-foreground"
                      aria-hidden="true"
                    >
                      Alt+T
                    </kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* ── Mobile overflow menu (#8) ── */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10"
                  aria-label="Mais opções"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-border bg-card">
                <DropdownMenuItem onClick={() => navigate('/favoritos')} className="cursor-pointer">
                  <Heart className="mr-2 h-4 w-4" />
                  Favoritos
                  {favoriteCount > 0 && (
                    <Badge className="ml-auto h-5 min-w-5 border-0 bg-orange px-1.5 text-[10px] text-orange-foreground">
                      {favoriteCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/comparar')} className="cursor-pointer">
                  <GitCompare className="mr-2 h-4 w-4" />
                  Comparar
                  {compareCount > 0 && (
                    <Badge className="ml-auto h-5 min-w-5 border-0 bg-orange px-1.5 text-[10px] text-orange-foreground">
                      {compareCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={handleToggleTheme} className="cursor-pointer">
                  {actualTheme === 'dark' ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  {actualTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Divider before avatar */}
          <div className="mx-1.5 hidden h-5 w-px bg-border/60 sm:block" />

          {/* ── User menu — com status online (#6) e truncate (#10) ── */}
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex h-9 items-center gap-2 rounded-xl px-1.5 hover:bg-primary/10 sm:px-2"
                      aria-label={`Menu do usuário: ${displayName}`}
                    >
                      <div className="relative">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-primary shadow-md ring-2 ring-background">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <User className="h-4 w-4 text-primary-foreground" />
                          )}
                        </div>
                        {/* #6 — Status online dot */}
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background"
                          aria-label="Online"
                        />
                      </div>
                      <div className="hidden flex-col items-start lg:flex">
                        <span
                          className="max-w-[120px] truncate text-sm font-medium leading-tight text-foreground"
                          aria-hidden="true"
                        >
                          {truncatedName}
                        </span>
                        <span className="sr-only">{displayName}</span>
                        {rolesLoaded ? (
                          <RoleBadge role={role} className="h-4 px-1.5 text-[9px] leading-none" />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="h-4 w-12 animate-pulse rounded bg-muted/40"
                          />
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl"
                >
                  Menu do usuário{' '}
                  <kbd className="ml-1.5 rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] text-primary-foreground">
                    Alt+U
                  </kbd>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="w-56 border-border bg-card">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{displayName}</span>
                  <span className="text-[11px] text-muted-foreground">{user?.email}</span>
                  {rolesLoaded ? (
                    <RoleBadge role={role} className="mt-1 self-start" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mt-1 h-5 w-16 animate-pulse self-start rounded bg-muted/40"
                    />
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => navigate('/admin/temas')}
                className="cursor-pointer hover:bg-primary/10 focus:bg-primary/10"
              >
                <Palette className="mr-2 h-4 w-4" />
                Skins
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 focus:bg-primary/10">
                <HelpCircle className="mr-2 h-4 w-4" />
                Ajuda
              </DropdownMenuItem>
              {!onboardingLoading && hasCompletedTour && (
                <DropdownMenuItem
                  onClick={() => restartTour()}
                  className="cursor-pointer hover:bg-primary/10 focus:bg-primary/10"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar Tour
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* #9 — Barra colorida de seção no bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/80 via-primary to-primary/40 opacity-60" />
    </header>
  );
}
