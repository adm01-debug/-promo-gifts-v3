import { User, Menu, Sparkles, Sun, Moon, Heart, GitCompare, Search, LogOut, Settings, HelpCircle, Shield } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { useAuth } from "@/contexts/AuthContext";
import { AdvancedSearch } from "@/components/search/AdvancedSearch";
import { useToast } from "@/hooks/use-toast";

import { StockAlertsIndicator } from "@/components/inventory/StockAlertsIndicator";


import { GlobalSearchPalette } from "@/components/search/GlobalSearchPalette";
import { CartHeaderButton } from "@/components/cart/CartHeaderButton";
import { useIsScrolled } from "@/hooks/useScroll";
import { cn } from "@/lib/utils";


interface HeaderProps {
  onMenuToggle: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header({ onMenuToggle, searchQuery, onSearchChange }: HeaderProps) {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const favoriteCount = useFavoritesStore((s) => s.favoriteCount);
  const compareCount = useComparisonStore((s) => s.compareCount);
  const { user, profile, role, isAdmin, signOut } = useAuth();
  
  // Hook para detectar scroll (AN-10)
  const isScrolled = useIsScrolled(20);

  const handleToggleTheme = () => {
    // Se estiver em "auto", ao clicar a gente fixa o tema oposto ao atual
    if (theme === "auto") {
      setTheme(actualTheme === "dark" ? "light" : "dark");
      return;
    }

    toggleTheme();
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Até logo!",
      description: "Você saiu da sua conta",
    });
    navigate("/auth");
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";
  const roleLabel = role === "admin" ? "Administrador" : "Vendedor";


  return (
    <header 
      className={cn(
        "sticky top-0 z-40 border-b safe-area-top transition-all duration-300",
        // Estado normal
        "bg-card/95 backdrop-blur-md border-border",
        // Estado scrolled - mais elevação e blur (AN-10)
        isScrolled && "bg-card/98 backdrop-blur-lg shadow-md border-border/80"
      )}
    >
      <div className="flex items-center justify-between h-12 sm:h-14 px-2 sm:px-4 lg:px-6">
        {/* Left section - Logo & Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-orange/10 hover:text-orange h-9 w-9 sm:h-10 sm:w-10"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-orange flex items-center justify-center shadow-md">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-sm sm:text-base font-bold text-foreground leading-tight">
                Promo
              </h1>
              <p className="text-[9px] sm:text-[10px] text-orange font-medium uppercase tracking-wider -mt-0.5">
                Brindes
              </p>
            </div>
          </div>

        </div>

        {/* Center section - Global Search */}
        <div className="flex-1 max-w-md mx-4 hidden md:block" data-tour="search">
          <GlobalSearchPalette />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-0.5 sm:gap-1">

          {/* Mobile search trigger */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-9 w-9 hover:bg-orange/10 hover:text-orange"
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
              document.dispatchEvent(event);
            }}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Seller Cart - visible on all screens */}
          <CartHeaderButton />

          {/* Stock Alerts - hidden on mobile */}
          <div className="hidden md:block">
            <StockAlertsIndicator />
          </div>

          {/* Favorites - hidden on mobile */}
          <div className="hidden md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                  onClick={() => navigate("/favoritos")}
                >
                  <Heart className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {favoriteCount > 0 && (
                    <Badge 
                      className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] bg-destructive text-destructive-foreground"
                    >
                      {favoriteCount > 99 ? "99+" : favoriteCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-card border-border">Meus Favoritos</TooltipContent>
            </Tooltip>
          </div>

          {/* Compare - hidden on mobile */}
          <div className="hidden md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                  onClick={() => navigate("/comparar")}
                >
                  <GitCompare className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {compareCount > 0 && (
                    <Badge 
                      className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] bg-orange text-orange-foreground"
                    >
                      {compareCount > 4 ? "4" : compareCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-card border-border">Comparar Produtos</TooltipContent>
            </Tooltip>
          </div>

          {/* Theme toggle - LAST action icon, after Compare */}
          <div className="hidden md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleTheme}
                  className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                >
                  <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" strokeWidth={1.75} />
                  <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={1.75} />
                  <span className="sr-only">Alternar tema</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-card border-border">
                {actualTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 h-9 px-2 hover:bg-orange/10 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange to-orange-active flex items-center justify-center ring-2 ring-background shadow-md">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={displayName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-orange-foreground" />
                  )}
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {roleLabel}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{displayName}</span>
                  <div className="flex items-center gap-1.5">
                    {isAdmin && <Shield className="h-3 w-3 text-orange" />}
                    <span className="text-xs text-muted-foreground">{roleLabel}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={() => navigate("/perfil")}
                className="hover:bg-orange/10 focus:bg-orange/10 cursor-pointer"
              >
                <User className="h-4 w-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate("/configuracoes")}
                className="hover:bg-orange/10 focus:bg-orange/10 cursor-pointer"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-orange/10 focus:bg-orange/10 cursor-pointer">
                <HelpCircle className="h-4 w-4 mr-2" />
                Ajuda
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
